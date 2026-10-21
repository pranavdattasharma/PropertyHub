
const express = require("express");
const mongoose = require("mongoose");
const AmenityBooking = require("../models/AmenityBooking");
const Amenity = require("../models/Amenity");
const Property = require("../models/Property");
const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

function toMinutes(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function getDayRange(bookingDate) {
  const date = new Date(bookingDate);

  if (Number.isNaN(date.getTime())) return null;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return { dayStart, dayEnd };
}

// Create a booking with concurrency protection
router.post("/", authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { amenityId, bookingDate, checkInTime, checkOutTime } = req.body;

    const start = toMinutes(checkInTime);
    const end = toMinutes(checkOutTime);
    const range = getDayRange(bookingDate);

    if (
      !mongoose.isValidObjectId(amenityId) ||
      !range ||
      start === null ||
      end === null ||
      start >= end
    ) {
      return res.status(400).json({
        message: "Provide a valid amenity, date, and time range.",
      });
    }

    const { dayStart, dayEnd } = range;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dayStart < today) {
      return res.status(400).json({
        message: "Bookings cannot be made for past dates.",
      });
    }

    let createdBooking;

    await session.withTransaction(async () => {
      const amenity = await Amenity.findById(amenityId).session(session);

      if (!amenity || amenity.availabilityStatus !== "Available") {
        const error = new Error("Amenity not found or unavailable.");
        error.status = 404;
        throw error;
      }

      const property = await Property.findById(amenity.propertyId).session(session);

      if (!property) {
        const error = new Error("Property not found.");
        error.status = 404;
        throw error;
      }

      if (req.user.role === "tenant") {
        const user = await User.findById(req.user.userId)
          .select("propertyId")
          .session(session);

        if (!user?.propertyId || String(user.propertyId) !== String(property._id)) {
          const error = new Error("You are not assigned to this property.");
          error.status = 403;
          throw error;
        }
      } else if (String(property.managerId) !== req.user.userId) {
        const error = new Error("Access denied.");
        error.status = 403;
        throw error;
      }

      // Force concurrent requests for this amenity to contend on the same document.
      const lock = await Amenity.updateOne(
        { _id: amenity._id, availabilityStatus: "Available" },
        { $inc: { bookingLockVersion: 1 } },
        { session }
      );

      if (lock.modifiedCount !== 1) {
        const error = new Error("Amenity is unavailable. Please try again.");
        error.status = 409;
        throw error;
      }

      // Recheck conflicts after acquiring the write lock.
      const existingBookings = await AmenityBooking.find({
        amenityId: amenity._id,
        bookingDate: { $gte: dayStart, $lt: dayEnd },
        status: { $in: ["Booked", "Checked In"] },
      }).session(session);

      const conflict = existingBookings.some((booking) => {
        const existingStart = toMinutes(booking.checkInTime);
        const existingEnd = toMinutes(booking.checkOutTime);
        return start < existingEnd && end > existingStart;
      });

      if (conflict) {
        const error = new Error(
          "This amenity is already booked during that time."
        );
        error.status = 409;
        throw error;
      }

      const bookings = await AmenityBooking.create(
        [{
          amenityId: amenity._id,
          propertyId: property._id,
          userId: req.user.userId,
          bookingDate: dayStart,
          checkInTime,
          checkOutTime,
          status: "Booked",
        }],
        { session }
      );

      createdBooking = bookings[0];
    });

    const io = req.app.get("io");

    if (io && createdBooking) {
      io.to(`property:${createdBooking.propertyId}`).emit(
        "booking:created",
        createdBooking
      );
    }

    return res.status(201).json({
      message: "Booking created.",
      booking: createdBooking,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Create booking:", error.message);

    return res.status(500).json({
      message: "Could not create booking.",
    });
  } finally {
    await session.endSession();
  }
});

// List bookings visible to the current user
router.get("/", authenticateToken, async (req, res) => {
  try {
    let filter;

    if (req.user.role === "tenant") {
      filter = { userId: req.user.userId };
    } else {
      const properties = await Property.find({
        managerId: req.user.userId,
      }).select("_id");

      filter = {
        propertyId: { $in: properties.map((property) => property._id) },
      };
    }

    const bookings = await AmenityBooking.find(filter)
      .populate("amenityId", "name")
      .populate("propertyId", "name")
      .populate("userId", "name email")
      .sort({ bookingDate: 1, checkInTime: 1 });

    return res.json({ bookings });
  } catch (error) {
    console.error("List bookings:", error.message);

    return res.status(500).json({
      message: "Could not fetch bookings.",
    });
  }
});

// Check in, complete, or cancel a booking
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Checked In", "Completed", "Cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status." });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID." });
    }

    const booking = await AmenityBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const property = await Property.findById(booking.propertyId);

    const isManager =
      req.user.role === "manager" &&
      String(property?.managerId) === req.user.userId;

    const isOwner = String(booking.userId) === req.user.userId;

    if (!isManager && !isOwner) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (booking.status === "Cancelled" || booking.status === "Completed") {
      return res.status(400).json({
        message: "This booking is already finished.",
      });
    }

    if (status === "Checked In" && booking.status !== "Booked") {
      return res.status(400).json({
        message: "Only booked reservations can be checked in.",
      });
    }

    if (
      status === "Completed" &&
      booking.status !== "Checked In" &&
      !isManager
    ) {
      return res.status(400).json({
        message: "Check in before completing the booking.",
      });
    }

    booking.status = status;
    await booking.save();

    const io = req.app.get("io");

    if (io) {
      io.to(`property:${booking.propertyId}`).emit("booking:updated", booking);
    }

    return res.json({
      message: "Booking status updated.",
      booking,
    });
  } catch (error) {
    console.error("Update booking:", error.message);

    return res.status(500).json({
      message: "Could not update booking.",
    });
  }
});

module.exports = router;

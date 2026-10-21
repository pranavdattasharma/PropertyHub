
const express = require("express");
const mongoose = require("mongoose");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Property = require("../models/Property");
const User = require("../models/User");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/auth");

const router = express.Router();

// Create a maintenance request
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { propertyId, issueDescription } = req.body;

    if (
      !propertyId ||
      !mongoose.isValidObjectId(propertyId) ||
      typeof issueDescription !== "string" ||
      !issueDescription.trim()
    ) {
      return res.status(400).json({
        message: "A valid property and issue description are required.",
      });
    }

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        message: "Property not found.",
      });
    }

    let tenantId = req.user.userId;

    if (req.user.role === "tenant") {
      // Read the latest assignment from MongoDB, not from the JWT.
      const tenant = await User.findById(req.user.userId)
        .select("role propertyId");

      if (!tenant || tenant.role !== "tenant") {
        return res.status(401).json({
          message: "Tenant account not found. Please sign in again.",
        });
      }

      if (
        !tenant.propertyId ||
        tenant.propertyId.toString() !== property._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You are not assigned to this property. Please ask your manager to verify your assignment.",
        });
      }

      tenantId = tenant._id;
    } else if (req.user.role === "manager") {
      // Managers can create requests only for properties they manage.
      if (property.managerId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          message: "You do not manage this property.",
        });
      }
    } else {
      return res.status(403).json({
        message: "You are not authorized to create maintenance requests.",
      });
    }

    const request = await MaintenanceRequest.create({
      propertyId: property._id,
      tenantId,
      issueDescription: issueDescription.trim(),
      status: "Pending",
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`property:${property._id}`).emit(
        "maintenance:created",
        request
      );
    }

    return res.status(201).json({
      message: "Maintenance request created successfully.",
      request,
    });
  } catch (error) {
    console.error("Create maintenance request:", error);

    return res.status(500).json({
      message: "Could not create maintenance request.",
    });
  }
});

// List maintenance requests visible to the current user
router.get("/", authenticateToken, async (req, res) => {
  try {
    let filter;

    if (req.user.role === "tenant") {
      filter = {
        tenantId: req.user.userId,
      };
    } else if (req.user.role === "manager") {
      const properties = await Property.find({
        managerId: req.user.userId,
      }).select("_id");

      filter = {
        propertyId: {
          $in: properties.map((property) => property._id),
        },
      };
    } else {
      return res.status(403).json({
        message: "You are not authorized to view maintenance requests.",
      });
    }

    const requests = await MaintenanceRequest.find(filter)
      .populate("propertyId", "name address")
      .sort({ createdAt: -1 });

    return res.json({ requests });
  } catch (error) {
    console.error("List maintenance requests:", error);

    return res.status(500).json({
      message: "Could not fetch maintenance requests.",
    });
  }
});

// Update request status: managers only
router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("manager"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const allowedStatuses = ["Pending", "In Progress", "Completed"];

      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid maintenance request ID.",
        });
      }

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid maintenance status.",
        });
      }

      const request = await MaintenanceRequest.findById(req.params.id);

      if (!request) {
        return res.status(404).json({
          message: "Maintenance request not found.",
        });
      }

      const property = await Property.findOne({
        _id: request.propertyId,
        managerId: req.user.userId,
      });

      if (!property) {
        return res.status(403).json({
          message: "You do not manage this property's maintenance requests.",
        });
      }

      request.status = status;
      request.resolutionDate =
        status === "Completed" ? new Date() : null;

      await request.save();

      const io = req.app.get("io");

      if (io) {
        io.to(`property:${property._id}`).emit(
          "maintenance:updated",
          request
        );
      }

      return res.json({
        message: "Maintenance status updated successfully.",
        request,
      });
    } catch (error) {
      console.error("Update maintenance status:", error);

      return res.status(500).json({
        message: "Could not update maintenance status.",
      });
    }
  }
);

module.exports = router;

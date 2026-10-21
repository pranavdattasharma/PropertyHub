
const express = require("express");
const Amenity = require("../models/Amenity");
const Property = require("../models/Property");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Create an amenity: property managers only
router.post(
  "/",
  authenticateToken,
  authorizeRoles("manager"),
  async (req, res) => {
    try {
      const { name, propertyId, description } = req.body;

      if (!name?.trim() || !propertyId) {
        return res.status(400).json({
          message: "Amenity name and property ID are required.",
        });
      }

      const property = await Property.findOne({
        _id: propertyId,
        managerId: req.user.userId,
      });

      if (!property) {
        return res.status(404).json({ message: "Property not found." });
      }

      const amenity = await Amenity.create({
        name: name.trim(),
        propertyId,
        description: description?.trim() || "",
      });

      res.status(201).json({
        message: "Amenity created successfully.",
        amenity,
      });
    } catch (error) {
      console.error("Create amenity:", error.message);
      res.status(500).json({ message: "Could not create amenity." });
    }
  }
);

// List amenities for properties the user can access
router.get("/", authenticateToken, async (req, res) => {
  try {
    let propertyIds = [];

    if (req.user.role === "manager") {
      const properties = await Property.find({
        managerId: req.user.userId,
      }).select("_id");

      propertyIds = properties.map((p) => p._id);
    } else {
      const User = require("../models/User");
      const user = await User.findById(req.user.userId).select("propertyId");

      if (user?.propertyId) propertyIds = [user.propertyId];
    }

    const amenities = await Amenity.find({
      propertyId: { $in: propertyIds },
    }).populate("propertyId", "name address");

    res.json({ amenities });
  } catch (error) {
    console.error("List amenities:", error.message);
    res.status(500).json({ message: "Could not fetch amenities." });
  }
});

module.exports = router;

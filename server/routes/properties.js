
const express = require("express");
const Property = require("../models/Property");
const User = require("../models/User");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Create a property: managers only

router.post("/", authenticateToken, authorizeRoles("manager"), async (req, res) => {
  try {
    const { name, address } = req.body;

    if (!name?.trim() || !address?.trim()) {
      return res.status(400).json({
        message: "Property name and address are required.",
      });
    }

    const normalizedAddress = address
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    const existingProperty = await Property.findOne({ normalizedAddress });

    if (existingProperty) {
      return res.status(409).json({
        message: "A property is already registered at this address. Please use a different location.",
      });
    }

    const property = await Property.create({
      name: name.trim(),
      address: address.trim(),
      normalizedAddress,
      managerId: req.user.userId,
    });

    return res.status(201).json({
      message: "Property created successfully.",
      property,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A property is already registered at this address.",
      });
    }

    console.error("Property creation error:", error);
    return res.status(500).json({
      message: "Unable to create property.",
    });
  }
});

// List properties accessible to the current user
router.get("/", authenticateToken, async (req, res) => {
  try {
    let properties;

    if (req.user.role === "manager") {
      properties = await Property.find({
        managerId: req.user.userId,
      });
    } else {
      const user = await User.findById(req.user.userId).select("propertyId");

      properties = user?.propertyId
        ? await Property.find({ _id: user.propertyId })
        : [];
    }

    res.json({ properties });
  } catch (error) {
    console.error("List properties:", error.message);
    res.status(500).json({ message: "Could not fetch properties." });
  }
});

// Assign a tenant to a property: that property's manager only
router.patch(
  "/:id/tenants",
  authenticateToken,
  authorizeRoles("manager"),
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email?.trim()) {
        return res.status(400).json({ message: "Tenant email is required." });
      }

      const property = await Property.findOne({
        _id: req.params.id,
        managerId: req.user.userId,
      });

      if (!property) {
        return res.status(404).json({ message: "Property not found." });
      }

      const tenant = await User.findOne({
        email: email.trim().toLowerCase(),
        role: "tenant",
      });

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found." });
      }

      tenant.propertyId = property._id;
      await tenant.save();

      res.json({
        message: "Tenant assigned successfully.",
        tenant: {
          id: tenant._id,
          name: tenant.name,
          email: tenant.email,
          propertyId: tenant.propertyId,
        },
      });
    } catch (error) {
      console.error("Assign tenant:", error.message);
      res.status(500).json({ message: "Could not assign tenant." });
    }
  }
);

module.exports = router;

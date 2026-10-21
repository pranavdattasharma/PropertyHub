
require("dotenv").config();

const mongoose = require("mongoose");

// Prevent automatic index creation before duplicate cleanup.
mongoose.set("autoIndex", false);

const Property = require("../models/Property");
const User = require("../models/User");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Amenity = require("../models/Amenity");
const AmenityBooking = require("../models/AmenityBooking");

function normalizeAddress(address) {
  return address
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const duplicateIds = [
      "6ad841564292e278cc596eae",
      "6ad8433d3e62cfbd649c02d6",
    ];

    // Recheck every duplicate before deleting it.
    for (const id of duplicateIds) {
      const property = await Property.findById(id);

      if (!property) continue;

      const [maintenance, amenities, bookings, tenants] = await Promise.all([
        MaintenanceRequest.countDocuments({ propertyId: id }),
        Amenity.countDocuments({ propertyId: id }),
        AmenityBooking.countDocuments({ propertyId: id }),
        User.countDocuments({ propertyId: id }),
      ]);

      if (maintenance + amenities + bookings + tenants > 0) {
        throw new Error(
          `Property ${id} now has references. No further changes made.`
        );
      }

      await Property.deleteOne({ _id: id });
      console.log(`Removed duplicate property: ${id}`);
    }

    // Backfill normalized addresses for existing records.
    const properties = await Property.find().lean();
    const seen = new Map();

    for (const property of properties) {
      const normalizedAddress = normalizeAddress(property.address);
      const existing = seen.get(normalizedAddress);

      if (existing) {
        throw new Error(
          `Another duplicate remains: "${property.address}". ` +
          "No unique index was created."
        );
      }

      seen.set(normalizedAddress, property._id);

      await Property.updateOne(
        { _id: property._id },
        { $set: { normalizedAddress } }
      );
    }

    // Enforce address uniqueness in MongoDB itself.
    await Property.collection.createIndex(
      { normalizedAddress: 1 },
      { unique: true, name: "unique_property_address" }
    );

    console.log("\nSuccess! Duplicate cleanup completed.");
    console.log("Unique property-address index created.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("\nCleanup failed:", error.message);
  process.exitCode = 1;
});

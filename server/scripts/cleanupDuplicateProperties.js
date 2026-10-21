
require("dotenv").config();
const mongoose = require("mongoose");
const Property = require("../models/Property");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Amenity = require("../models/Amenity");
const AmenityBooking = require("../models/AmenityBooking");
const User = require("../models/User");

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const idsToCheck = [
      "6ad841564292e278cc596eae",
      "6ad8433d3e62cfbd649c02d6",
    ];

    for (const id of idsToCheck) {
      const property = await Property.findById(id).lean();

      if (!property) {
        console.log(`\n${id}: already absent`);
        continue;
      }

      const [maintenance, amenities, bookings, tenants] = await Promise.all([
        MaintenanceRequest.countDocuments({ propertyId: id }),
        Amenity.countDocuments({ propertyId: id }),
        AmenityBooking.countDocuments({ propertyId: id }),
        User.countDocuments({ propertyId: id }),
      ]);

      console.log(`\nProperty: ${property.name} (${id})`);
      console.log({ maintenance, amenities, bookings, tenants });
      console.log(
        maintenance + amenities + bookings + tenants === 0
          ? "Candidate for cleanup: no references found."
          : "Keep for review: references exist."
      );
    }
  } catch (error) {
    console.error("Inspection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();

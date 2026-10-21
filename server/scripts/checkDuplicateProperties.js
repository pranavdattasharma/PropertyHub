
require("dotenv").config();
const mongoose = require("mongoose");
const Property = require("../models/Property");

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const properties = await Property.find().lean();
    const groups = new Map();

    for (const property of properties) {
      const key = (property.normalizedAddress || property.address)
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(property);
    }

    const duplicates = [...groups.entries()].filter(
      ([, items]) => items.length > 1
    );

    if (duplicates.length === 0) {
      console.log("No duplicate addresses found.");
      return;
    }

    for (const [address, items] of duplicates) {
      console.log("\nDuplicate address:", address);

      for (const item of items) {
        console.log({
          id: item._id.toString(),
          name: item.name,
          managerId: item.managerId?.toString(),
        });
      }
    }

    console.log("\nNo records were deleted.");
  } catch (error) {
    console.error("Check failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();


const mongoose = require("mongoose");

function normalizeAddress(address) {
  return address
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const propertySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedAddress: {
      type: String,
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

propertySchema.pre("validate", function () {
  if (this.address) {
    this.normalizedAddress = normalizeAddress(this.address);
  }
});

propertySchema.index(
  { normalizedAddress: 1 },
  { unique: true, name: "unique_property_address" }
);

module.exports = mongoose.model("Property", propertySchema);

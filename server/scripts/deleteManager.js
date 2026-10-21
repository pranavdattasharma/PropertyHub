
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = "pyayivar@gmail.com";

    const manager = await User.findOne({ email, role: "manager" });

    if (!manager) {
      console.log("No manager account found with that email.");
      return;
    }

    await User.deleteOne({ _id: manager._id });

    console.log("Mistaken manager account deleted successfully.");
  } catch (error) {
    console.error("Error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();

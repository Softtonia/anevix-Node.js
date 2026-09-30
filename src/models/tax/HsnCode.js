const mongoose = require("mongoose");

const hsnCodeSchema = new mongoose.Schema(
  {
    hsnCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Create an index for fast text searching
hsnCodeSchema.index({ description: "text", hsnCode: "text" });

// Add a regular index to optimize the $regex prefix search
hsnCodeSchema.index({ hsnCode: 1 });

const HsnCode = mongoose.model("HsnCode", hsnCodeSchema);
module.exports = HsnCode;

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

const HsnCode = mongoose.model("HsnCode", hsnCodeSchema);
module.exports = HsnCode;

const mongoose = require("mongoose");

const pickupAddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pinCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    contactPerson: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    pickupType: {
      type: String,
      enum: ["WAREHOUSE", "STORE", "HOME"],
      default: "WAREHOUSE",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PickupAddress", pickupAddressSchema);

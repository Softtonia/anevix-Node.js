const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Quantity cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    reservedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Reserved quantity cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    manageStock: {
      type: Boolean,
      default: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, "Low stock threshold cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    backorders: {
      type: String,
      enum: ["no", "notify", "yes"],
      default: "no",
    },
  },
  {
    timestamps: true,
  }
);

// Mutually exclusive ownership validation
inventorySchema.pre("validate", function () {
  const hasProduct = this.productId != null;
  const hasVariant = this.variantId != null;

  if (hasProduct && hasVariant) {
    this.invalidate("productId", "Cannot have both productId and variantId");
    this.invalidate("variantId", "Cannot have both productId and variantId");
  } else if (!hasProduct && !hasVariant) {
    this.invalidate("productId", "Must provide exactly ONE of productId or variantId");
    this.invalidate("variantId", "Must provide exactly ONE of productId or variantId");
  }

  if (this.reservedQuantity > this.quantity) {
    this.invalidate("reservedQuantity", "Reserved quantity cannot exceed total quantity");
  }
});

// Partial unique indexes to prevent duplicate inventory.
// These only apply to documents where the field exists and is not null.
inventorySchema.index(
  { productId: 1 },
  { unique: true, partialFilterExpression: { productId: { $type: "objectId" } } }
);

inventorySchema.index(
  { variantId: 1 },
  { unique: true, partialFilterExpression: { variantId: { $type: "objectId" } } }
);

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = Inventory;

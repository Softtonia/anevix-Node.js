const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    image: {
      id: { type: String, default: null },
      src: { type: String, default: null },
      alt: { type: String, default: null },
    },
    logo: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent circular dependencies in parent references
brandSchema.pre("save", async function () {
  if (this.isModified("parent") && this.parent) {
    if (this.parent.equals(this._id)) {
      throw new Error("A brand cannot be its own parent.");
    }
    // Check for circular dependency going up the tree
    let currentParentId = this.parent;
    let depth = 0;
    while (currentParentId) {
      if (depth > 10) throw new Error("Maximum brand depth exceeded.");
      const parentBrand = await mongoose.model("Brand").findById(currentParentId).select("_id parent");
      if (!parentBrand) {
        throw new Error("Parent brand does not exist.");
      }
      if (parentBrand._id.equals(this._id) || (parentBrand.parent && parentBrand.parent.equals(this._id))) {
        throw new Error("Circular parent relationship detected.");
      }
      currentParentId = parentBrand.parent;
      depth++;
    }
  }
});

const Brand = mongoose.model("Brand", brandSchema);

module.exports = Brand;

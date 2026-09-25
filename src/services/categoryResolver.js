const mongoose = require("mongoose");
const ProductCategory = require("../models/ProductCategory");
const Category = require("../models/Category");

const SUPPORTED_CATEGORY_TYPES = [
  "ProductCategory",
  "Category",
];

const MAX_DEPTH = 25;

/**
 * CategoryResolver is the sole abstraction for resolving category existence,
 * parent relationships, and ancestor/breadcrumb chains across models.
 */
class CategoryResolver {
  /**
   * Validate that category_type is supported
   */
  static validateType(categoryType) {
    if (!categoryType || typeof categoryType !== "string") {
      throw new Error(`category_type is required and must be one of: ${SUPPORTED_CATEGORY_TYPES.join(", ")}`);
    }
    if (!SUPPORTED_CATEGORY_TYPES.includes(categoryType)) {
      throw new Error(`Invalid category_type '${categoryType}'. Must be one of: ${SUPPORTED_CATEGORY_TYPES.join(", ")}`);
    }
  }

  /**
   * Validate that category_id has a valid ObjectId format
   */
  static validateId(categoryId) {
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new Error(`Invalid category_id format: '${categoryId}'`);
    }
  }

  /**
   * Normalize an entity document into the common CategoryNode representation
   */
  static normalizeNode(doc, type, calculatedLevel = 1) {
    if (!doc) return null;
    const raw = doc.toObject ? doc.toObject() : doc;

    let name = raw.name;
    let parentId = null;
    let parentType = null;

    if (type === "ProductCategory") {
      name = raw.cat_name || raw.sub_cat_name || raw.name;
      parentId = raw.parentId ? (raw.parentId._id ? raw.parentId._id.toString() : raw.parentId.toString()) : null;
      parentType = raw.parentId ? "ProductCategory" : null;
    } else if (type === "Category") {
      name = raw.name;
      parentId = raw.parentId ? raw.parentId.toString() : null;
      parentType = raw.parentId ? "Category" : null;
    }

    return {
      id: raw._id.toString(),
      name: name || "",
      slug: raw.slug || "",
      type: type,
      parentId: parentId,
      parentType: parentType,
      level: calculatedLevel,
      isActive: raw.isActive !== undefined ? raw.isActive : true,
    };
  }

  /**
   * Find a category node directly by its type and ID
   */
  static async findNode(categoryType, categoryId) {
    this.validateType(categoryType);
    this.validateId(categoryId);

    let doc = null;
    if (categoryType === "ProductCategory") {
      doc = await ProductCategory.findById(categoryId).lean();
    } else if (categoryType === "Category") {
      doc = await Category.findById(categoryId).lean();
    }

    if (!doc) {
      const err = new Error(`${categoryType} with id '${categoryId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    return doc;
  }

  /**
   * Resolve an ordered ancestry chain from Root to Leaf.
   * Returns: [RootNode, ..., LeafNode]
   * Each node has its `level` dynamically calculated (Root = 1).
   */
  static async resolveAncestry(categoryType, categoryId) {
    this.validateType(categoryType);
    this.validateId(categoryId);

    // ----------------------------------------------------
    // Scenario A: ProductCategory (supports infinite self-referencing parent tree)
    // ----------------------------------------------------
    if (categoryType === "ProductCategory") {
      const rawNodes = [];
      const visited = new Set();
      let currentId = categoryId.toString();

      while (currentId) {
        if (visited.has(currentId)) {
          const err = new Error(
            `Cycle detected in category hierarchy! Node '${currentId}' was visited more than once.`
          );
          err.statusCode = 400;
          throw err;
        }
        if (visited.size >= MAX_DEPTH) {
          const err = new Error(
            `Category hierarchy exceeds maximum supported depth of ${MAX_DEPTH} levels.`
          );
          err.statusCode = 400;
          throw err;
        }

        visited.add(currentId);
        const doc = await ProductCategory.findById(currentId).lean();
        if (!doc) {
          const err = new Error(`ProductCategory node with id '${currentId}' not found in ancestry path`);
          err.statusCode = 404;
          throw err;
        }

        rawNodes.push(doc);

        if (doc.parentId) {
          currentId = doc.parentId.toString();
        } else {
          currentId = null;
        }
      }

      rawNodes.reverse();
      return rawNodes.map((doc, index) => {
        return this.normalizeNode(doc, "ProductCategory", index + 1);
      });
    }

    // ----------------------------------------------------
    // Scenario B: Generic self-referencing Category model
    // ----------------------------------------------------
    if (categoryType === "Category") {
      const rawNodes = [];
      const visited = new Set();
      let currentId = categoryId.toString();

      while (currentId) {
        if (visited.has(currentId)) {
          const err = new Error(
            `Cycle detected in category hierarchy! Node '${currentId}' was visited more than once.`
          );
          err.statusCode = 400;
          throw err;
        }
        if (visited.size >= MAX_DEPTH) {
          const err = new Error(
            `Category hierarchy exceeds maximum supported depth of ${MAX_DEPTH} levels.`
          );
          err.statusCode = 400;
          throw err;
        }

        visited.add(currentId);
        const doc = await Category.findById(currentId).lean();
        if (!doc) {
          const err = new Error(`Category node with id '${currentId}' not found in ancestry path`);
          err.statusCode = 404;
          throw err;
        }

        rawNodes.push(doc);

        if (doc.parentId) {
          currentId = doc.parentId.toString();
        } else {
          currentId = null; // Reached root!
        }
      }

      // rawNodes is leaf -> root. Reverse to make it root -> leaf.
      rawNodes.reverse();

      return rawNodes.map((doc, index) => {
        return this.normalizeNode(doc, "Category", index + 1);
      });
    }

    throw new Error(`Unhandled category_type: ${categoryType}`);
  }

  /**
   * Build the breadcrumb array from an ancestry chain
   */
  static buildBreadcrumb(ancestry) {
    return ancestry.map((node) => ({
      id: node.id,
      name: node.name,
      slug: node.slug,
      type: node.type,
      level: node.level,
    }));
  }
}

module.exports = CategoryResolver;
module.exports.SUPPORTED_CATEGORY_TYPES = SUPPORTED_CATEGORY_TYPES;

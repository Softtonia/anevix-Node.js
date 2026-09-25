const ProductCategory = require("../models/ProductCategory");
const CategoryGuideline = require("../models/CategoryGuideline");
const mongoose = require("mongoose");
const formatCategoryResponse = (category) => {
  const cat = category.toObject ? category.toObject() : category;

  let parentId = null;
  let parentName = null;

  if (cat.parentId) {
    if (typeof cat.parentId === "object" && cat.parentId._id) {
      parentId = cat.parentId._id.toString();
      parentName = cat.parentId.cat_name || null;
    } else {
      parentId = cat.parentId.toString();
    }
  }

  return {
    id: cat._id.toString(),
    cat_name: cat.cat_name,
    slug: cat.slug,
    parent: parentId,
    parent_name: parentName,
    image: cat.image ? { src: cat.image } : null,
    description: cat.description || "",
    display: cat.display || "default",
    menu_order: cat.menu_order || 0,
    count: cat.count || 0,
    isActive: cat.isActive,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  };
};

// Helper: Check for circular references when setting parentId
const checkCycle = async (categoryId, targetParentId) => {
  if (!targetParentId) return false;
  if (categoryId && targetParentId.toString() === categoryId.toString())
    return true;

  let currentParentId = targetParentId;
  const visited = new Set();
  if (categoryId) visited.add(categoryId.toString());

  while (currentParentId) {
    const parentIdStr = currentParentId.toString();
    if (visited.has(parentIdStr)) {
      return true; // Cycle detected!
    }
    visited.add(parentIdStr);

    const parentDoc = await ProductCategory.findById(currentParentId).lean();
    if (!parentDoc) break;
    currentParentId = parentDoc.parentId;
  }
  return false;
};

// @desc    Create new product category (supports any nesting level via parent/parentId)
// @route   POST /api/product-categories
// @access  Private/Admin
const createProductCategory = async (req, res) => {
  try {
    const {
      name,
      cat_name,
      slug,
      image,
      isActive,
      description,
      display,
      menu_order,
      parent,
      parentId,
    } = req.body;
    const finalParentId = parent !== undefined ? parent : parentId;
    const categoryName = (name || cat_name || "").trim();

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Auto-generate slug if not explicitly passed
    let categorySlug = slug
      ? slug.trim().toLowerCase()
      : categoryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

    let existingCategory = await ProductCategory.findOne({
      slug: categorySlug,
    });
    if (existingCategory) {
      if (slug) {
        return res
          .status(400)
          .json({ message: "Category with this slug already exists" });
      }
      categorySlug = `${categorySlug}-${Date.now()}`;
    }

    let parentDoc = null;
    let resolvedParentModel = "ProductCategory";

    if (finalParentId && finalParentId !== "null" && finalParentId !== 0) {
      if (!mongoose.Types.ObjectId.isValid(finalParentId)) {
        return res
          .status(400)
          .json({ message: "Invalid parent category ID format" });
      }

      // Look up parent across ProductCategory, ProductSubCategory, or ProductNestedSubCategory
      parentDoc = await ProductCategory.findById(finalParentId);
      
      

      if (!parentDoc) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    const finalImage =
      typeof image === "object" && image?.src ? image.src : image;
    const resolvedParent =
      finalParentId && finalParentId !== "null" && finalParentId !== 0
        ? finalParentId
        : null;

    const category = new ProductCategory({
      cat_name: categoryName,
      slug: categorySlug,
      parentId: resolvedParent,
      description: description !== undefined ? description : "",
      display: display !== undefined ? display : "default",
      menu_order: menu_order !== undefined ? Number(menu_order) : 0,
      image: finalImage || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdCategory = await category.save();
    await createdCategory.populate("parentId", "cat_name");
    const responseData = formatCategoryResponse(createdCategory);
    if (parentDoc && !responseData.parent_name) {
      responseData.parent_name =
        parentDoc.cat_name || parentDoc.sub_cat_name || parentDoc.name || null;
    }
    res.status(201).json(responseData);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Category with this slug already exists" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all product categories (supports filtering by parent)
// @route   GET /api/product-categories
// @access  Public
const getProductCategories = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === "admin";
    const query = {};

    if (!isAdmin) {
      query.isActive = true;
    }

    // If parent filter is explicitly provided:
    if (req.query.parent !== undefined) {
      if (
        req.query.parent === "null" ||
        req.query.parent === "0" ||
        req.query.parent === ""
      ) {
        query.parentId = null;
      } else if (mongoose.Types.ObjectId.isValid(req.query.parent)) {
        query.parentId = req.query.parent;
      }
    } else if (req.query.all !== "true") {
      // By default, return ONLY Top-Level (Root) categories where parentId is null
      query.parentId = null;
    }

    const categories = await ProductCategory.find(query)
      .populate("parentId", "cat_name")
      .sort({ menu_order: 1, createdAt: -1 });
    const response = categories.map((cat) => formatCategoryResponse(cat));
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get full category hierarchy tree
// @route   GET /api/product-categories/tree
// @access  Public
const getProductCategoryTree = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === "admin";
    const query = isAdmin ? {} : { isActive: true };

    const categories = await ProductCategory.find(query)
      .populate("parentId", "cat_name")
      .sort({ menu_order: 1, createdAt: -1 })
      .lean();

    // Build hierarchical tree
    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat._id.toString()] = {
        ...formatCategoryResponse(cat),
        children: [],
      };
    });

    const rootCategories = [];
    categories.forEach((cat) => {
      const catId = cat._id.toString();
      const pId = cat.parentId
        ? cat.parentId._id
          ? cat.parentId._id.toString()
          : cat.parentId.toString()
        : null;
      if (pId && categoryMap[pId]) {
        categoryMap[pId].children.push(categoryMap[catId]);
      } else {
        rootCategories.push(categoryMap[catId]);
      }
    });

    res.json(rootCategories);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single product category
// @route   GET /api/product-categories/:id
// @access  Public
const getProductCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await ProductCategory.findById(id).populate(
      "parentId",
      "cat_name",
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const isAdmin = req.admin || req.user?.role === "admin";
    if (!isAdmin && !category.isActive) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(formatCategoryResponse(category));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update product category
// @route   PUT /api/product-categories/:id
// @access  Private/Admin
const updateProductCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      cat_name,
      name,
      sub_cat_name,
      slug,
      image,
      isActive,
      description,
      display,
      menu_order,
      parent,
      parentId,
      guidelines,
    } = req.body;
    
    if (typeof guidelines === 'string') {
      try { guidelines = JSON.parse(guidelines); } catch (e) {}
    }

    const finalParentId = parent !== undefined ? parent : parentId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await ProductCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (slug && slug !== category.slug) {
      const existingCategory = await ProductCategory.findOne({ slug });
      if (existingCategory) {
        return res
          .status(400)
          .json({ message: "Category with this slug already exists" });
      }
    }

    // Handle parent update & cycle check
    if (finalParentId !== undefined) {
      if (finalParentId && finalParentId !== "null" && finalParentId !== 0) {
        if (!mongoose.Types.ObjectId.isValid(finalParentId)) {
          return res
            .status(400)
            .json({ message: "Invalid parent category ID format" });
        }
        if (finalParentId === id) {
          return res
            .status(400)
            .json({ message: "Category cannot be its own parent" });
        }
        let parentDoc = await ProductCategory.findById(finalParentId);
        
        if (!parentDoc) {
          return res.status(404).json({ message: "Parent category not found" });
        }
        const isCycle = await checkCycle(id, finalParentId);
        if (isCycle) {
          return res
            .status(400)
            .json({
              message:
                "Circular hierarchy detected! A category cannot have one of its descendants as a parent.",
            });
        }
        category.parentId = finalParentId;
      } else {
        category.parentId = null;
      }
    }

    // Check children before deactivation
    if (isActive === false && category.isActive === true) {
      const activeChildren = await ProductCategory.find({
        parentId: id,
        isActive: true,
      });
      if (activeChildren.length > 0) {
        return res.status(400).json({
          message:
            "Cannot deactivate category with active child categories. Deactivate children first.",
        });
      }
    }

    let finalImage = null;
    if (image === null) {
      finalImage = null;
    } else if (typeof image === "string" && image.trim() !== "") {
      finalImage = image;
    } else if (typeof image === "object" && image?.src) {
      finalImage = image.src;
    }
    
    if (req.file) {
      finalImage = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    const categoryName = name || cat_name || sub_cat_name;

    if (categoryName !== undefined) category.cat_name = categoryName.trim();
    category.slug = slug !== undefined ? slug : category.slug;
    if (description !== undefined) category.description = description;
    if (display !== undefined) category.display = display;
    if (menu_order !== undefined) category.menu_order = Number(menu_order);
    if (image !== undefined || req.file) category.image = finalImage;
    category.isActive = isActive !== undefined ? isActive : category.isActive;

    const updatedCategory = await category.save();

    // Update guidelines if provided
    let createdGuidelines = [];
    if (guidelines && Array.isArray(guidelines)) {
      // Delete old guidelines
      await require("../models/CategoryGuideline").deleteMany({ category_id: id });
      
      const newGuidelines = [];
      for (const g of guidelines) {
        if (g.guideline_type && g.title) {
          newGuidelines.push({
            category_id: updatedCategory._id,
            category_type: "ProductCategory",
            guideline_type: g.guideline_type,
            field_type: g.field_type || "text",
            title: g.title.trim(),
            description: g.description ? g.description.trim() : "",
            content: g.content || { items: [] },
            menu_order: g.menu_order || 0,
            is_active: g.is_active !== undefined ? g.is_active : true,
          });
        }
      }
      if (newGuidelines.length > 0) {
        const inserted = await require("../models/CategoryGuideline").insertMany(newGuidelines);
        createdGuidelines = inserted.map(g => ({
            id: g._id.toString(),
            guideline_type: g.guideline_type,
            field_type: g.field_type,
            title: g.title,
            description: g.description,
            content: g.content,
            menu_order: g.menu_order,
        }));
      }
    }

    await updatedCategory.populate("parentId", "cat_name");
    const responseObj = formatCategoryResponse(updatedCategory);
    if (guidelines && Array.isArray(guidelines)) {
        responseObj.guidelines = createdGuidelines;
    }

    res.json(responseObj);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Category with this slug already exists" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete product category
// @route   DELETE /api/product-categories/:id
// @access  Private/Admin
const deleteProductCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await ProductCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const getAllDescendantIds = async (parentId) => {
      let descendantIds = [];
      const children = await ProductCategory.find({ parentId }).select('_id');
      for (let child of children) {
        descendantIds.push(child._id);
        const nestedChildrenIds = await getAllDescendantIds(child._id);
        descendantIds = descendantIds.concat(nestedChildrenIds);
      }
      return descendantIds;
    };

    const allDescendantIds = await getAllDescendantIds(category._id);
    const allIdsToDelete = [category._id, ...allDescendantIds];

    // Also delete guidelines associated with this category and all its descendants
    await require("../models/CategoryGuideline").deleteMany({ category_id: { $in: allIdsToDelete } });

    // Delete the category and all its descendants
    await ProductCategory.deleteMany({ _id: { $in: allIdsToDelete } });

    res.json({
      message: `Category and ${allDescendantIds.length} subcategorie(s) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get category hierarchy level with guidelines
// @route   GET /api/product-categories/hierarchy-with-guidelines
// @access  Public
const getCategoryHierarchyWithGuidelines = async (req, res) => {
  try {
    const { parent_id } = req.query;
    const isAdmin = req.admin || req.user?.role === "admin";
    const isActiveQuery = isAdmin ? {} : { isActive: true };

    let categories = [];
    let categoryType = "";

    if (!parent_id) {
      categories = await ProductCategory.find({ ...isActiveQuery, parentId: null })
        .sort({ menu_order: 1, createdAt: -1 })
        .lean();
      categoryType = "ProductCategory";
    } else {
      if (!mongoose.Types.ObjectId.isValid(parent_id)) {
        return res.status(400).json({ message: "Invalid parent_id format" });
      }

      const parentDoc = await ProductCategory.findById(parent_id);
      if (!parentDoc) {
         return res.status(404).json({ message: "Parent category not found" });
      }

      categories = await ProductCategory.find({
        parentId: parent_id,
        ...isActiveQuery,
      })
        .sort({ menu_order: 1, createdAt: -1 })
        .lean();
      categoryType = "ProductCategory";
    }

    if (categories.length === 0) {
      return res.json([]);
    }

    const categoryIds = categories.map((c) => c._id);
    const guidelineQuery = {
      category_id: { $in: categoryIds },
      category_type: categoryType,
    };
    if (!isAdmin) {
      guidelineQuery.is_active = true;
    }
    const guidelines = await CategoryGuideline.find(guidelineQuery).lean();

    const guidelinesByCatId = {};
    guidelines.forEach((g) => {
      const cid = g.category_id.toString();
      if (!guidelinesByCatId[cid]) {
        guidelinesByCatId[cid] = [];
      }
      guidelinesByCatId[cid].push({
        id: g._id.toString(),
        guideline_type: g.guideline_type,
        field_type: g.field_type,
        title: g.title,
        description: g.description,
        content: g.content,
        menu_order: g.menu_order,
      });
    });

    const response = categories.map((cat) => ({
      id: cat._id.toString(),
      name: cat.cat_name || cat.sub_cat_name || cat.name,
      slug: cat.slug,
      image: cat.image ? { src: cat.image } : null,
      description: cat.description || "",
      display: cat.display || "default",
      menu_order: cat.menu_order || 0,
      count: cat.count || 0,
      isActive: cat.isActive,
      type: categoryType,
      guidelines: guidelinesByCatId[cat._id.toString()] || [],
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Create category at dynamic level with guidelines
// @route   POST /api/product-categories/hierarchy-with-guidelines
// @access  Private/Admin
const createCategoryHierarchyWithGuidelines = async (req, res) => {
  try {
    let {
      name,
      slug,
      image,
      description,
      display,
      menu_order,
      isActive,
      parent_id,
      guidelines,
    } = req.body || {};

    if (typeof guidelines === 'string') {
      try {
        guidelines = JSON.parse(guidelines);
      } catch (e) {}
    }

    let categoryName = name || req.body.cat_name || req.body.sub_cat_name;

    if (!categoryName || categoryName.trim() === "") {
      return res.status(400).json({ message: "Category name is required" });
    }

    let categorySlug = slug
      ? slug.trim().toLowerCase()
      : categoryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

    let existingCat = await ProductCategory.findOne({ slug: categorySlug });
    
    if (existingCat) {
      if (slug) {
        return res
          .status(400)
          .json({ message: "Category with this slug already exists" });
      }
      categorySlug = `${categorySlug}-${Date.now()}`;
    }

    let finalImage = null;
    if (typeof image === "string" && image.trim() !== "") {
      finalImage = image;
    } else if (typeof image === "object" && image?.src) {
      finalImage = image.src;
    }
    
    if (req.file) {
      finalImage = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    let createdCategory = null;
    let categoryType = "ProductCategory";

    if (!parent_id) {
      createdCategory = new ProductCategory({
        cat_name: categoryName.trim(),
        slug: categorySlug,
        parentId: null,
        description: description || "",
        display: display || "default",
        menu_order: menu_order || 0,
        image: finalImage || null,
        isActive: isActive !== undefined ? isActive : true,
      });
      await createdCategory.save();
    } else {
      if (!mongoose.Types.ObjectId.isValid(parent_id)) {
        return res.status(400).json({ message: "Invalid parent_id format" });
      }

      const parentDoc = await ProductCategory.findById(parent_id);
      if (!parentDoc) {
         return res.status(404).json({ message: "Parent category not found" });
      }

      createdCategory = new ProductCategory({
        cat_name: categoryName.trim(),
        slug: categorySlug,
        parentId: parent_id,
        description: description || "",
        display: display || "default",
        menu_order: menu_order || 0,
        image: finalImage || null,
        isActive: isActive !== undefined ? isActive : true,
      });
      await createdCategory.save();
    }

    const createdGuidelines = [];
    if (guidelines && Array.isArray(guidelines) && guidelines.length > 0) {
      for (const g of guidelines) {
        if (g.guideline_type && g.title) {
          const guideline = new CategoryGuideline({
            category_id: createdCategory._id,
            category_type: categoryType,
            guideline_type: g.guideline_type,
            field_type: g.field_type || "text",
            title: g.title.trim(),
            description: g.description ? g.description.trim() : "",
            content: g.content || { items: [] },
            menu_order: g.menu_order || 0,
            is_active: g.is_active !== undefined ? g.is_active : true,
          });
          const savedGuideline = await guideline.save();
          createdGuidelines.push({
            id: savedGuideline._id.toString(),
            guideline_type: savedGuideline.guideline_type,
            field_type: savedGuideline.field_type,
            title: savedGuideline.title,
            description: savedGuideline.description,
            content: savedGuideline.content,
            menu_order: savedGuideline.menu_order,
          });
        }
      }
    }

    res.status(201).json({
      message: "Category created successfully",
      category: {
        id: createdCategory._id.toString(),
        name:
          createdCategory.cat_name ||
          createdCategory.sub_cat_name ||
          createdCategory.name,
        slug: createdCategory.slug,
        type: categoryType,
        description: createdCategory.description,
        image: createdCategory.image ? { src: createdCategory.image } : null,
        parent_id: parent_id || null,
      },
      guidelines: createdGuidelines,
    });
  } catch (error) {
    // Rollback the created category if guideline insertion failed
    if (createdCategory && createdCategory._id) {
      try {
        await ProductCategory.findByIdAndDelete(createdCategory._id);
      } catch (rollbackError) {
        console.error("Failed to rollback category:", rollbackError);
      }
    }

    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Category with this slug already exists" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createProductCategory,
  getProductCategories,
  getProductCategoryTree,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
  getCategoryHierarchyWithGuidelines,
  createCategoryHierarchyWithGuidelines,
};

const CategoryConfigService = require("../services/categoryConfigService");
const CategoryResolver = require("../services/categoryResolver");

// @desc    Get aggregated category configuration (breadcrumb, inherited fields, guidelines, catalog config)
// @route   GET /api/category-configs/:categoryType/:categoryId
// @access  Public / Passive Admin
const getCategoryConfiguration = async (req, res) => {
  try {
    const { categoryType, categoryId } = req.params;

    CategoryResolver.validateType(categoryType);
    CategoryResolver.validateId(categoryId);

    const isAdmin = !!req.admin;
    const activeOnly = !isAdmin;

    const aggregated = await CategoryConfigService.getAggregatedConfig(
      categoryType,
      categoryId,
      { activeOnly }
    );

    res.json(aggregated);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ message: error.message });
  }
};

module.exports = {
  getCategoryConfiguration,
};

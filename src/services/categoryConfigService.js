const CategoryResolver = require("./categoryResolver");
const CategoryCustomField = require("../models/CategoryCustomField");
const CategoryCustomFieldValue = require("../models/CategoryCustomFieldValue");
const CategoryGuideline = require("../models/CategoryGuideline");
const CategoryCatalogConfig = require("../models/CategoryCatalogConfig");

/**
 * Utility to deep-merge plain objects.
 * Target properties are overridden by source properties recursively.
 */
function isPlainObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

function deepMerge(target = {}, source = {}) {
  const output = { ...target };
  if (isPlainObject(target) && isPlainObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isPlainObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

class CategoryConfigService {
  /**
   * Resolve and build the complete aggregated category configuration.
   * Walks ancestry root -> leaf.
   * - Custom fields: closest definition overrides parent
   * - Guidelines: additive across ancestry, grouped by guideline_type
   * - Catalog config: deep-merged root -> leaf
   */
  static async getAggregatedConfig(categoryType, categoryId, { activeOnly = true } = {}) {
    // 1. Resolve full ancestry chain [Root, ..., Leaf]
    const ancestry = await CategoryResolver.resolveAncestry(categoryType, categoryId);
    const leafNode = ancestry[ancestry.length - 1];
    const breadcrumb = CategoryResolver.buildBreadcrumb(ancestry);

    // Build pairs for querying configurations attached to any node in the chain
    const categoryQueryConditions = ancestry.map((node) => ({
      category_id: node.id,
      category_type: node.type,
    }));

    // ----------------------------------------------------
    // 2. Custom Fields Inheritance
    // ----------------------------------------------------
    const fieldFilter = { $or: categoryQueryConditions };
    if (activeOnly) {
      fieldFilter.is_active = true;
    }

    const allCustomFields = await CategoryCustomField.find(fieldFilter)
      .sort({ menu_order: 1, createdAt: 1 })
      .lean();

    // Map fields by category node id for sequential processing root -> leaf
    const fieldsByNodeId = new Map();
    for (const field of allCustomFields) {
      const key = `${field.category_type}_${field.category_id.toString()}`;
      if (!fieldsByNodeId.has(key)) {
        fieldsByNodeId.set(key, []);
      }
      fieldsByNodeId.get(key).push(field);
    }

    // Process from root (index 0) to leaf (index N).
    // A lower level definition with the same field_key overrides the parent definition.
    const mergedFieldsMap = new Map();

    for (const node of ancestry) {
      const key = `${node.type}_${node.id}`;
      const nodeFields = fieldsByNodeId.get(key) || [];

      for (const field of nodeFields) {
        mergedFieldsMap.set(field.field_key, {
          id: field._id.toString(),
          field_key: field.field_key,
          field_name: field.field_name,
          field_type: field.field_type,
          is_required: field.is_required,
          is_active: field.is_active,
          menu_order: field.menu_order,
          field_config: field.field_config || {},
          validation_config: field.validation_config || {},
          inherited_from: {
            id: node.id,
            name: node.name,
            type: node.type,
            level: node.level,
          },
        });
      }
    }

    const mergedFields = Array.from(mergedFieldsMap.values());

    // Fetch options / values for the merged fields
    if (mergedFields.length > 0) {
      const fieldIds = mergedFields.map((f) => f.id);
      const values = await CategoryCustomFieldValue.find({
        cat_custom_field_id: { $in: fieldIds },
      }).lean();

      const valuesByFieldId = new Map(
        values.map((v) => [v.cat_custom_field_id.toString(), v.field_value])
      );

      for (const f of mergedFields) {
        const val = valuesByFieldId.get(f.id);
        if (val !== undefined && val !== null) {
          if (val && typeof val === "object" && val.options) {
            f.options = val.options;
          } else {
            f.options = val;
          }
        } else {
          f.options = null;
        }
      }
    }

    // Sort final merged fields by menu_order
    mergedFields.sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0));

    // ----------------------------------------------------
    // 3. Guidelines (Additive across ancestry)
    // ----------------------------------------------------
    const guidelineFilter = { $or: categoryQueryConditions };
    if (activeOnly) {
      guidelineFilter.is_active = true;
    }

    const allGuidelines = await CategoryGuideline.find(guidelineFilter)
      .sort({ menu_order: 1, createdAt: 1 })
      .lean();

    // Map each guideline to its originating ancestor metadata
    const ancestryMap = new Map(ancestry.map((n) => [`${n.type}_${n.id}`, n]));

    const groupedGuidelines = {
      general: [],
      image: [],
      product: [],
      quality: [],
      measurement: [],
      catalogue: [],
    };

    for (const g of allGuidelines) {
      const originNode = ancestryMap.get(`${g.category_type}_${g.category_id.toString()}`);
      const formatted = {
        id: g._id.toString(),
        guideline_type: g.guideline_type,
        field_type: g.field_type || "text",
        title: g.title,
        description: g.description || "",
        content: g.content || {},
        menu_order: g.menu_order || 0,
        inherited_from: originNode
          ? {
              id: originNode.id,
              name: originNode.name,
              type: originNode.type,
              level: originNode.level,
            }
          : null,
      };

      if (!groupedGuidelines[g.guideline_type]) {
        groupedGuidelines[g.guideline_type] = [];
      }
      groupedGuidelines[g.guideline_type].push(formatted);
    }

    // ----------------------------------------------------
    // 4. Catalog Configuration (Deep-merged root -> leaf)
    // ----------------------------------------------------
    const catalogConfigFilter = { $or: categoryQueryConditions };
    if (activeOnly) {
      catalogConfigFilter.is_active = true;
    }

    const allCatalogConfigs = await CategoryCatalogConfig.find(catalogConfigFilter).lean();
    const configsByNodeKey = new Map(
      allCatalogConfigs.map((c) => [`${c.category_type}_${c.category_id.toString()}`, c])
    );

    let mergedCatalogConfig = {
      measurement: {
        enabled: false,
        image: null,
        title: "Size Guide",
      },
      product_image: {
        min_images: 1,
        max_images: 9,
        primary_image_required: true,
        front_image_required: true,
      },
      catalogue: {},
      quality: {},
      additional_config: {},
    };

    for (const node of ancestry) {
      const nodeConfig = configsByNodeKey.get(`${node.type}_${node.id}`);
      if (nodeConfig) {
        if (nodeConfig.measurement) {
          mergedCatalogConfig.measurement = deepMerge(
            mergedCatalogConfig.measurement,
            nodeConfig.measurement
          );
        }
        if (nodeConfig.product_image) {
          mergedCatalogConfig.product_image = deepMerge(
            mergedCatalogConfig.product_image,
            nodeConfig.product_image
          );
        }
        if (nodeConfig.catalogue) {
          mergedCatalogConfig.catalogue = deepMerge(
            mergedCatalogConfig.catalogue,
            nodeConfig.catalogue
          );
        }
        if (nodeConfig.quality) {
          mergedCatalogConfig.quality = deepMerge(
            mergedCatalogConfig.quality,
            nodeConfig.quality
          );
        }
        if (nodeConfig.additional_config) {
          mergedCatalogConfig.additional_config = deepMerge(
            mergedCatalogConfig.additional_config,
            nodeConfig.additional_config
          );
        }
      }
    }

    // Return the unified response
    return {
      category: {
        id: leafNode.id,
        name: leafNode.name,
        slug: leafNode.slug,
        type: leafNode.type,
        level: leafNode.level,
      },
      breadcrumb,
      catalogConfig: mergedCatalogConfig,
      guidelines: groupedGuidelines,
      custom_fields: mergedFields,
    };
  }
}

module.exports = CategoryConfigService;
module.exports.deepMerge = deepMerge;

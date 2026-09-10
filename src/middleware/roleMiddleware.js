const RoleHasUser = require("../models/RoleHasUser");
const Role = require("../models/Role");

const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const roleMappings = await RoleHasUser.find({
        user_id: req.user.id,
      });

      if (!roleMappings.length) {
        return res.status(403).json({
          success: false,
          message: "No role assigned to this account",
        });
      }

      const roleIds = roleMappings.map((mapping) => mapping.role_id);

      const roles = await Role.find({
        id: { $in: roleIds },
      });

      const userRoleSlugs = roles.map((role) => role.slug);

      const hasAllowedRole = allowedRoles.some((role) =>
        userRoleSlugs.includes(role)
      );

      if (!hasAllowedRole) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to access this resource",
        });
      }

      req.userRoles = userRoleSlugs;

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message,
      });
    }
  };
};

module.exports = requireRole;
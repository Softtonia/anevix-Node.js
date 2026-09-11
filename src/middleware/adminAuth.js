const jwt = require("jsonwebtoken");

const adminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const User = require("../models/User");
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    const RoleHasUser = require("../models/RoleHasUser");
    const Role = require("../models/Role");

    const roleMappings = await RoleHasUser.find({ user_id: user._id });
    const roleIds = roleMappings.map(m => m.role_id);
    const roles = await Role.find({ id: { $in: roleIds } });
    
    const hasAdminRole = roles.some((role) => role.slug === "admin");

    if (!hasAdminRole) {
      return res.status(403).json({
        message: "Forbidden: Admin access required",
      });
    }

    req.admin = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    // Also set req.user for consistency if other middleware needs it
    req.user = req.admin;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = adminAuth;

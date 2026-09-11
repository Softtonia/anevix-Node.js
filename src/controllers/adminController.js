const User = require("../models/User");
const RoleHasUser = require("../models/RoleHasUser");
const Role = require("../models/Role");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");


const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminUser = await User.findOne({ email });

    if (!adminUser) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const roleMappings = await RoleHasUser.find({ user_id: adminUser._id });
    const roleIds = roleMappings.map(m => m.role_id);
    const roles = await Role.find({ id: { $in: roleIds } });
    
    const hasAdminRole = roles.some((role) => role.slug === "admin");
    
    if (!hasAdminRole) {
      return res.status(403).json({
        message: "Forbidden: Admin access required",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: adminUser._id,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const adminUser = await User.findOne({ email });

    if (!adminUser) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    const roleMappings = await RoleHasUser.find({ user_id: adminUser._id });
    const roleIds = roleMappings.map(m => m.role_id);
    const roles = await Role.find({ id: { $in: roleIds } });
    
    if (!roles.some((role) => role.slug === "admin")) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    adminUser.passwordResetTokenHash = resetToken;
    adminUser.passwordResetExpiresAt = Date.now() + 15 * 60 * 1000;

    await adminUser.save();

    return res.status(200).json({
      message: "Password reset token generated",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const adminUser = await User.findOne({
      passwordResetTokenHash: token,
      passwordResetExpiresAt: { $gt: Date.now() },
    });

    if (!adminUser) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    adminUser.password = hashedPassword;
    adminUser.passwordResetTokenHash = undefined;
    adminUser.passwordResetExpiresAt = undefined;

    await adminUser.save();

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

module.exports = { loginAdmin, forgotPassword, resetPassword };

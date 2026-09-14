const User = require("../models/User");
const RoleHasUser = require("../models/RoleHasUser");
const Role = require("../models/Role");
const EmailTemplate = require("../models/EmailTemplate");
const sendEmail = require("../utils/sendEmail");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");


const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminUser = await User.findOne({ email: email.trim().toLowerCase() });

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

    const template = await EmailTemplate.findOne({ key: "FORGOT_PASSWORD_ADMIN" });
    if (!template) {
      return res.status(500).json({
        message: "Email template not found for FORGOT_PASSWORD_ADMIN",
      });
    }

    const resetLink = `${process.env.FRONTEND_URL || 'https://api.anevix.in'}/admin/reset-password/${resetToken}`;
    const userName = `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim();

    let htmlBody = template.body;
    htmlBody = htmlBody.replace(/\{\{UserName\}\}/gi, userName).replace(/\{\{user_name\}\}/gi, userName);
    htmlBody = htmlBody.replace(/\{\{ResetLink\}\}/gi, resetLink).replace(/\{\{reset_link\}\}/gi, resetLink);

    await sendEmail(
      adminUser.email,
      template.subject,
      "Please view this email in an HTML-compatible client.",
      htmlBody
    );

    return res.status(200).json({
      message: "Password reset token generated and email sent",
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
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        message: "Password and confirmPassword are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const adminUser = await User.findOne({
      passwordResetTokenHash: token,
      passwordResetExpiresAt: { $gt: Date.now() },
    });

    if (!adminUser) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    const isSamePassword = await bcrypt.compare(password, adminUser.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
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

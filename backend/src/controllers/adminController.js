const Admin = require("../models/Admin");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, admin.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
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

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await admin.save();

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

    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    admin.password = hashedPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;

    await admin.save();

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

module.exports = { registerAdmin, loginAdmin, forgotPassword, resetPassword };

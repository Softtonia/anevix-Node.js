const User = require("../models/User");
const Role = require("../models/Role");
const RoleHasUser = require("../models/RoleHasUser");
const Address = require("../models/Address");
const Order = require("../models/Order");
const Wishlist = require("../models/Wishlist");
const SavedPaymentMethod = require("../models/SavedPaymentMethod");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const generateOTP = require("../utils/otp");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

const addUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User added successfully",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const signupUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, role } = req.body;
    
    let requestedRoleSlug = role || req.query.ref || req.query.role || 'b2b-customer';
    
    if (requestedRoleSlug.includes('seller') || requestedRoleSlug.includes('supplier') || requestedRoleSlug === 'b2c-seller') {
        requestedRoleSlug = 'b2c-seller';
    } else if (requestedRoleSlug.includes('customer') || requestedRoleSlug === 'b2b-customer') {
        requestedRoleSlug = 'b2b-customer';
    }

    if (!firstName || !lastName || !password || (!email && !phoneNumber)) {
      return res.status(400).json({
        message: "First name, last name, password and email or phone number are required",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase().trim() }] : []),
        ...(phoneNumber ? [{ phoneNumber: phoneNumber.trim() }] : []),
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email or mobile",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
      password: hashedPassword,
    });

    const emailOtp = generateOTP();
    const mobileOtp = "123456"; // Dummy OTP for now

    let verificationTypes = [];

    if (email) {
      const emailOtpHash = crypto.createHash("sha256").update(emailOtp).digest("hex");
      newUser.emailOtpHash = emailOtpHash;
      newUser.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await sendEmail(
        newUser.email,
        "Anevix Email Verification OTP",
        `Your Anevix verification OTP is: ${emailOtp}. It is valid for 10 minutes.`
      );
      verificationTypes.push("email");
    }
    
    if (phoneNumber) {
      const mobileOtpHash = crypto.createHash("sha256").update(mobileOtp).digest("hex");
      newUser.mobileOtpHash = mobileOtpHash;
      newUser.mobileOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      // Not sending SMS right now, just using dummy OTP
      verificationTypes.push("mobile");
    }

    await newUser.save();

    // Assign role
    try {
      let assignedRole = await Role.findOne({ slug: requestedRoleSlug });
      
      // If the requested role doesn't exist yet, auto-create it safely
      if (!assignedRole) {
        const lastRole = await Role.findOne().sort({ id: -1 });
        const newRoleId = lastRole ? lastRole.id + 1 : 2;
        
        // Capitalize the first letter for the name
        const roleName = requestedRoleSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        assignedRole = await Role.create({
          id: newRoleId,
          name: roleName,
          slug: requestedRoleSlug,
          guard: requestedRoleSlug === 'b2b-customer' ? 'app' : 'web', // typically customers use app, sellers use web
          is_default: requestedRoleSlug === 'b2b-customer'
        });
      }

      if (assignedRole) {
        const lastPivot = await RoleHasUser.findOne().sort({ id: -1 });
        const nextId = lastPivot ? lastPivot.id + 1 : 1;

        await RoleHasUser.create({
          id: nextId,
          role_id: assignedRole.id,
          user_id: newUser._id
        });
      }
    } catch (roleError) {
      console.error("Error assigning role during signup:", roleError);
    }


    return res.status(201).json({
      success: true,
      message: "Signup successful",
      verificationTypes,
      dummyMobileOtp: phoneNumber ? mobileOtp : undefined,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const verifyEmailOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (
      user.emailOtpHash !== otpHash ||
      !user.emailOtpExpiresAt ||
      user.emailOtpExpiresAt < new Date()
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    user.isEmailVerified = true;
    user.isAccountVerified = true;
    user.status = "active";

    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const resendEmailOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.email) {
      return res.status(400).json({
        message: "No email address is associated with this account",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    const otp = generateOTP();

    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    user.emailOtpHash = otpHash;
    user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    await sendEmail(
      user.email,
      "Anevix Email Verification OTP",
      `Your Anevix verification OTP is: ${otp}. It is valid for 10 minutes.`,
    );

    return res.status(200).json({
      success: true,
      message: "Verification OTP resent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const verifyMobileOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isMobileVerified) {
      return res.status(400).json({
        message: "Mobile number is already verified",
      });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (
      user.mobileOtpHash !== otpHash ||
      !user.mobileOtpExpiresAt ||
      user.mobileOtpExpiresAt < new Date()
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    user.isMobileVerified = true;
    user.isAccountVerified = true;
    user.status = "active";

    user.mobileOtpHash = null;
    user.mobileOtpExpiresAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Mobile verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Account is not active",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -emailOtpHash -emailOtpExpiresAt -mobileOtpHash -mobileOtpExpiresAt -passwordResetTokenHash -passwordResetExpiresAt -__v"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Fetch related profile data concurrently
    const [
      addresses,
      orderHistory,
      wishlist,
      savedPaymentMethods,
      reviews,
      notifications
    ] = await Promise.all([
      Address.find({ user: user._id }),
      Order.find({ user: user._id }).sort({ createdAt: -1 }),
      Wishlist.find({ user: user._id }).populate('product'), // populating product if schema exists
      SavedPaymentMethod.find({ user: user._id }),
      Review.find({ user: user._id }),
      Notification.find({ user: user._id }).sort({ createdAt: -1 })
    ]);

    // Separate default address from the rest
    const defaultAddress = addresses.find(addr => addr.isDefault) || null;
    const otherAddresses = addresses.filter(addr => !addr.isDefault);

    return res.status(200).json({
      success: true,
      profile: {
        ...user._doc, // user document properties
        addresses: otherAddresses,
        defaultAddress,
        orderHistory,
        wishlist,
        savedPaymentMethods,
        reviews,
        notifications
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phoneNumber, password, status } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email.toLowerCase().trim();
    if (phoneNumber) user.phoneNumber = phoneNumber.trim();
    if (status) user.status = status;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        status: user.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    await sendEmail(
      user.email,
      "Anevix Password Reset",
      `Your password reset token is: ${resetToken}. It is valid for 15 minutes.`
    );

    return res.status(200).json({
      success: true,
      message: "Password reset token sent to email",
      resetToken, // Returned for easier testing
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetTokenHash: resetTokenHash,
      passwordResetExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

module.exports = {
  addUser,
  signupUser,
  verifyEmailOTP,
  loginUser,
  getUserProfile,
  verifyMobileOTP,
  logoutUser,
  resendEmailOTP,
  deleteUser,
  editUser,
  forgotPassword,
  resetPassword,
};

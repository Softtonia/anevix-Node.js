const User = require("../models/User");
const Role = require("../models/Role");
const RoleHasUser = require("../models/RoleHasUser");
const Address = require("../models/Address");
const Order = require("../models/Order");
const Wishlist = require("../models/Wishlist");
const SavedPaymentMethod = require("../models/SavedPaymentMethod");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const SellerProfile = require("../models/SellerProfile");
const bcrypt = require("bcryptjs");
const generateOTP = require("../utils/otp");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");
const { createNotification } = require("../services/notificationService");

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

const getValidatedRoles = async (roleSlugs) => {
  const roles = await Role.find({ slug: { $in: roleSlugs } });
  if (roles.length !== roleSlugs.length) {
    const foundSlugs = roles.map((r) => r.slug);
    const missing = roleSlugs.filter((s) => !foundSlugs.includes(s));
    throw new Error(`Invalid roles requested: ${missing.join(", ")}`);
  }
  return roles;
};

const createUserAccount = async (firstName, lastName, email, phoneNumber, password) => {
  if (!firstName || !lastName || !password || (!email && !phoneNumber)) {
    throw new Error("First name, last name, password and email or phone number are required");
  }

  const existingUser = await User.findOne({
    $or: [
      ...(email ? [{ email: email.toLowerCase().trim() }] : []),
      ...(phoneNumber ? [{ phoneNumber: phoneNumber.trim() }] : []),
    ],
  });

  if (existingUser) {
    throw new Error("User already exists with this email or mobile");
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
    const emailOtpHash = crypto
      .createHash("sha256")
      .update(emailOtp)
      .digest("hex");
    newUser.emailOtpHash = emailOtpHash;
    newUser.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await sendEmail(
      newUser.email,
      "Anevix Email Verification OTP",
      `Your Anevix verification OTP is: ${emailOtp}. It is valid for 10 minutes.`,
    );
    verificationTypes.push("email");
  }

  if (phoneNumber) {
    const mobileOtpHash = crypto
      .createHash("sha256")
      .update(mobileOtp)
      .digest("hex");
    newUser.mobileOtpHash = mobileOtpHash;
    newUser.mobileOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    verificationTypes.push("mobile");
  }

  await newUser.save();

  return { newUser, verificationTypes, dummyMobileOtp: phoneNumber ? mobileOtp : undefined };
};

const assignRolesToUser = async (userId, roles) => {
  for (const assignedRole of roles) {
    const existingPivot = await RoleHasUser.findOne({
      role_id: assignedRole.id,
      user_id: userId,
    });
    if (!existingPivot) {
      const lastPivot = await RoleHasUser.findOne().sort({ id: -1 });
      const nextId = lastPivot ? lastPivot.id + 1 : 1;
      await RoleHasUser.create({
        id: nextId,
        role_id: assignedRole.id,
        user_id: userId,
      });
    }
  }
};

const registerCustomer = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, role, roles } = req.body;
    
    if (role || roles) {
      return res.status(400).json({ success: false, message: "Customer registration does not accept role selection" });
    }

    const validatedRoles = await getValidatedRoles(["b2c-customer"]);
    
    const { newUser, verificationTypes, dummyMobileOtp } = await createUserAccount(firstName, lastName, email, phoneNumber, password);
    
    await assignRolesToUser(newUser._id, validatedRoles);

    return res.status(201).json({
      success: true,
      message: "Customer signup successful",
      verificationTypes,
      dummyMobileOtp,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
      },
    });
  } catch (error) {
    const status = error.message.includes("User already exists") || error.message.includes("are required") || error.message.includes("Invalid roles") ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

const registerBusiness = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, roles } = req.body;
    
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ success: false, message: "Business registration requires at least one valid role" });
    }

    const allowedRoles = ["b2c-seller", "b2b-buyer", "b2b-seller"];
    const hasInvalidRole = roles.some(r => !allowedRoles.includes(r));
    if (hasInvalidRole) {
      return res.status(400).json({ success: false, message: "Invalid roles provided for business registration" });
    }

    const validatedRoles = await getValidatedRoles(roles);
    
    const { newUser, verificationTypes, dummyMobileOtp } = await createUserAccount(firstName, lastName, email, phoneNumber, password);
    
    await assignRolesToUser(newUser._id, validatedRoles);

    return res.status(201).json({
      success: true,
      message: "Business signup successful",
      verificationTypes,
      dummyMobileOtp,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
      },
    });
  } catch (error) {
    const status = error.message.includes("Invalid roles") || error.message.includes("User already exists") || error.message.includes("are required") ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

const initializeSellerProfileIfApplicable = async (userId) => {
  try {
    const sellerRole = await Role.findOne({ slug: "b2c-seller" });
    if (!sellerRole) return;
    const hasRole = await RoleHasUser.findOne({ role_id: sellerRole.id, user_id: userId });
    if (hasRole) {
      await SellerProfile.findOneAndUpdate(
        { user: userId },
        { user: userId },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  } catch (err) {
    console.error("Failed to initialize seller profile:", err);
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

    const wasAccountVerified = user.isAccountVerified;

    user.isEmailVerified = true;
    user.isAccountVerified = true;
    user.status = "active";

    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;

    await user.save();

    await initializeSellerProfileIfApplicable(user._id);

    if (!wasAccountVerified) {
      try {
        await createNotification({
          user: user._id,
          title: "Welcome to Anevix",
          message: "Your account has been verified successfully. Welcome to Anevix!",
          type: "WELCOME",
          data: {},
        });
      } catch (err) {
        console.error("Failed to create WELCOME notification:", err);
      }
    }

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

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

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

    const wasAccountVerified = user.isAccountVerified;

    user.isMobileVerified = true;
    user.isAccountVerified = true;
    user.status = "active";

    user.mobileOtpHash = null;
    user.mobileOtpExpiresAt = null;

    await user.save();

    await initializeSellerProfileIfApplicable(user._id);

    if (!wasAccountVerified) {
      try {
        await createNotification({
          user: user._id,
          title: "Welcome to Anevix",
          message: "Your account has been verified successfully. Welcome to Anevix!",
          type: "WELCOME",
          data: {},
        });
      } catch (err) {
        console.error("Failed to create WELCOME notification:", err);
      }
    }

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

const authenticateUser = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new Error("Invalid email or password");
  
  if (user.status !== "active") throw new Error("Account is not active");
  if (!user.isEmailVerified) throw new Error("Please verify your email first");
  
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) throw new Error("Invalid email or password");

  return user;
};

const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authenticateUser(email, password);

    // Fetch user roles
    const rolePivots = await RoleHasUser.find({ user_id: user._id });
    const roleIds = rolePivots.map(p => p.role_id);
    const roles = await Role.find({ id: { $in: roleIds } });
    const roleSlugs = roles.map(r => r.slug);

    if (!roleSlugs.includes("b2c-customer")) {
      return res.status(403).json({ success: false, message: "Unauthorized access for customer portal" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
    const status = error.message.includes("Invalid") || error.message.includes("verify") ? 401 : (error.message.includes("active") ? 403 : 500);
    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

const loginBusiness = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authenticateUser(email, password);

    const rolePivots = await RoleHasUser.find({ user_id: user._id });
    const roleIds = rolePivots.map(p => p.role_id);
    const roles = await Role.find({ id: { $in: roleIds } });
    const roleSlugs = roles.map(r => r.slug);

    const hasBusinessRole = roleSlugs.some(slug => ["b2c-seller", "b2b-buyer", "b2b-seller"].includes(slug));
    
    if (!hasBusinessRole) {
      return res.status(403).json({ success: false, message: "Unauthorized access for business portal" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
    const status = error.message.includes("Invalid") || error.message.includes("verify") ? 401 : (error.message.includes("active") ? 403 : 500);
    return res.status(status).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -emailOtpHash -emailOtpExpiresAt -mobileOtpHash -mobileOtpExpiresAt -passwordResetTokenHash -passwordResetExpiresAt -__v",
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
      notifications,
    ] = await Promise.all([
      Address.find({ user: user._id }),
      Order.find({ user: user._id }).sort({ createdAt: -1 }),
      Wishlist.find({ user: user._id }).populate("product"), // populating product if schema exists
      SavedPaymentMethod.find({ user: user._id }),
      Review.find({ user: user._id }),
      Notification.find({ user: user._id }).sort({ createdAt: -1 }),
    ]);

    // Separate default address from the rest
    const defaultAddress = addresses.find((addr) => addr.isDefault) || null;
    const otherAddresses = addresses.filter((addr) => !addr.isDefault);

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
        notifications,
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
    const { firstName, lastName, email, phoneNumber, password, status } =
      req.body;

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
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    await sendEmail(
      user.email,
      "Anevix Password Reset",
      `Your password reset token is: ${resetToken}. It is valid for 15 minutes.`,
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

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

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

    try {
      await createNotification({
        user: user._id,
        title: "Password Changed",
        message: "Your password has been changed successfully.",
        type: "PASSWORD_CHANGED",
        data: {},
      });
    } catch (err) {
      console.error("Failed to create PASSWORD_CHANGED notification:", err);
    }

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

const updateUnverifiedContact = async (req, res) => {
  try {
    const { userId, email, phoneNumber } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!email && !phoneNumber) {
      return res
        .status(400)
        .json({ message: "Please provide an email or phone number to update" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isAccountVerified) {
      return res
        .status(400)
        .json({
          message:
            "Account is already verified. Cannot update contact details here.",
        });
    }

    let verificationTypes = [];
    const dummyMobileOtp = "123456";

    if (email) {
      const lowerEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({
        email: lowerEmail,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Email is already in use by another account" });
      }

      user.email = lowerEmail;

      const emailOtp = generateOTP();
      user.emailOtpHash = crypto
        .createHash("sha256")
        .update(emailOtp)
        .digest("hex");
      user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await sendEmail(
        user.email,
        "Anevix Email Verification OTP",
        `Your updated Anevix verification OTP is: ${emailOtp}. It is valid for 10 minutes.`,
      );
      verificationTypes.push("email");
    }

    if (phoneNumber) {
      const trimPhone = phoneNumber.trim();
      const existingUser = await User.findOne({
        phoneNumber: trimPhone,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res
          .status(400)
          .json({
            message: "Phone number is already in use by another account",
          });
      }

      user.phoneNumber = trimPhone;
      user.mobileOtpHash = crypto
        .createHash("sha256")
        .update(dummyMobileOtp)
        .digest("hex");
      user.mobileOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      verificationTypes.push("mobile");
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Contact details updated successfully. New OTP sent.",
      verificationTypes,
      dummyMobileOtp: phoneNumber ? dummyMobileOtp : undefined,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const addOrder = async (req, res) => {
  try {
    const { totalAmount, status } = req.body;
    const userId = req.user.id;

    if (totalAmount === undefined) {
      return res.status(400).json({ message: "Total amount is required" });
    }

    const newOrder = await Order.create({
      user: userId,
      totalAmount,
      status: status || "Pending",
    });

    try {
      await createNotification({
        user: userId,
        title: "Order Placed",
        message: "Your order has been placed successfully.",
        type: "ORDER_PLACED",
        data: { orderId: newOrder._id },
      });
    } catch (err) {
      console.error("Failed to create ORDER_PLACED notification:", err);
    }

    return res.status(201).json({
      success: true,
      message: "Order added successfully",
      order: newOrder,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Check if already in wishlist
    const existingItem = await Wishlist.findOne({
      user: userId,
      product: productId,
    });
    if (existingItem) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    const newWishlistItem = await Wishlist.create({
      user: userId,
      product: productId,
    });

    return res.status(201).json({
      success: true,
      message: "Added to wishlist successfully",
      wishlistItem: newWishlistItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const addSavedPaymentMethod = async (req, res) => {
  try {
    const { provider, last4, isDefault } = req.body;
    const userId = req.user.id;

    if (!provider || !last4) {
      return res.status(400).json({ message: "Provider and last4 are required" });
    }

    if (isDefault) {
      // If setting as default, remove default from existing ones
      await SavedPaymentMethod.updateMany(
        { user: userId },
        { $set: { isDefault: false } }
      );
    }

    const newPaymentMethod = await SavedPaymentMethod.create({
      user: userId,
      provider,
      last4,
      isDefault: isDefault || false,
    });

    return res.status(201).json({
      success: true,
      message: "Payment method saved successfully",
      paymentMethod: newPaymentMethod,
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
  registerCustomer,
  registerBusiness,
  verifyEmailOTP,
  loginCustomer,
  loginBusiness,
  getUserProfile,
  verifyMobileOTP,
  logoutUser,
  resendEmailOTP,
  deleteUser,
  editUser,
  forgotPassword,
  resetPassword,
  updateUnverifiedContact,
  addOrder,
  addToWishlist,
  addSavedPaymentMethod,
};

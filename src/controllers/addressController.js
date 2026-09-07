const Address = require("../models/Address");

const addAddress = async (req, res) => {
  try {
    const { street, city, state, zipCode, country, isDefault } = req.body;
    
    const userId = req.user.id;

    if (!street || !city || !state || !zipCode || !country) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    const newAddress = new Address({
      user: userId,
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || false,
    });

    await newAddress.save();

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error adding address",
      error: error.message,
    });
  }
};

module.exports = {
  addAddress,
};

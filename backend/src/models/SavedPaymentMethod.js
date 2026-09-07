const mongoose = require('mongoose');

const savedPaymentMethodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: String, // e.g., 'Stripe', 'Razorpay', 'Credit Card'
      required: true,
    },
    last4: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const SavedPaymentMethod = mongoose.model('SavedPaymentMethod', savedPaymentMethodSchema);

module.exports = SavedPaymentMethod;

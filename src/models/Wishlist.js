const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // In a real app, this would reference a Product model
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // Assuming a Product model will exist
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;

const mongoose = require('mongoose');

const roleHasUserSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role_id: {
      type: Number,
      ref: 'Role',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const RoleHasUser = mongoose.model('RoleHasUser', roleHasUserSchema);

module.exports = RoleHasUser;

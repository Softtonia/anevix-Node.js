const mongoose = require('mongoose');

const roleHasUserSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    role_id: {
      type: Number,
      required: true,
      ref: 'Role' // Refers to the Role custom id
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // Refers to either User or Admin
    }
  },
  {
    timestamps: true,
  }
);

const RoleHasUser = mongoose.model('RoleHasUser', roleHasUserSchema);

module.exports = RoleHasUser;

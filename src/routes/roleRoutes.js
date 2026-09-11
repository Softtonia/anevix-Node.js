const express = require('express');
const router = express.Router();
const {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/roleController');

const adminAuth = require('../middleware/adminAuth');

router.route('/')
  .get(adminAuth, getRoles)
  .post(adminAuth, createRole);

router.route('/:id')
  .get(adminAuth, getRole)
  .put(adminAuth, updateRole)
  .delete(adminAuth, deleteRole);

module.exports = router;

const Role = require('../models/Role');

// Get all roles
const getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json({ success: true, count: roles.length, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Get single role by custom id
const getRole = async (req, res) => {
  try {
    const role = await Role.findOne({ id: req.params.id });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    res.status(200).json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Create a new role
const createRole = async (req, res) => {
  try {
    let { id, name, slug, guard, is_default } = req.body;
    
    // Auto-generate numeric ID if not provided
    if (!id) {
       const lastRole = await Role.findOne().sort({ id: -1 });
       id = lastRole ? lastRole.id + 1 : 1;
    }

    const role = await Role.create({
      id, name, slug, guard, is_default
    });

    res.status(201).json({ success: true, data: role });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Bad Request', error: error.message });
  }
};

// Update role
const updateRole = async (req, res) => {
  try {
    const role = await Role.findOneAndUpdate({ id: req.params.id }, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    res.status(200).json({ success: true, data: role });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Bad Request', error: error.message });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findOneAndDelete({ id: req.params.id });
    
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole
};

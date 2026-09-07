const express = require("express");
const b2bCustomerAuth = require("../middleware/b2bCustomerAuth");
const { addAddress } = require("../controllers/addressController");

const router = express.Router();

router.post("/", b2bCustomerAuth, addAddress);

module.exports = router;

const express = require("express");
const authenticateJWT = require("../middleware/authenticateJWT");
const { addAddress } = require("../controllers/addressController");

const router = express.Router();

router.post("/", authenticateJWT, addAddress);

module.exports = router;

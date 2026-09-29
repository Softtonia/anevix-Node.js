const express = require("express");
const router = express.Router();
const hsnController = require("../../controllers/tax/hsnController");

router.get("/search", hsnController.searchHsn);

module.exports = router;

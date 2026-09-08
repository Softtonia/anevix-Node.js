const express = require("express");
const b2bCustomerAuth = require("../middleware/b2bCustomerAuth");
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(b2bCustomerAuth);

router.get("/", getUserNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;

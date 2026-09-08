const Notification = require("../models/Notification");

const createNotification = async ({ user, title, message, type, data = {} }) => {
  if (!user || !title || !message || !type) {
    throw new Error("Missing required fields for creating notification");
  }

  const notification = await Notification.create({
    user,
    title,
    message,
    type,
    data,
    isRead: false,
  });

  return notification;
};

module.exports = {
  createNotification,
};

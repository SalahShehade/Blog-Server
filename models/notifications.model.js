const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  recipient: {
    type: String, // Change from ObjectId to String
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false, // Default to unread
  },
  createdAt: {
    type: Date,
    default: Date.now, // Timestamp when the notification is created
  },
});

module.exports = mongoose.model("Notification", NotificationSchema);

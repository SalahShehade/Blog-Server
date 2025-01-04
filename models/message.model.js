const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true,
    index: true, // 🟢 Added index for faster lookups
  },
  senderEmail: {
    type: String,
    required: true,
    match: /.+\@.+\..+/, // 🟢 Ensure it's a valid email
    index: true, // 🟢 Added index for faster lookups
  },
  receiverEmail: {
    type: String,
    required: true,
    match: /.+\@.+\..+/, // 🟢 Ensure it's a valid email
    index: true, // 🟢 Added index for faster lookups
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    // 🟢 Renamed to 'isRead' for better clarity
    type: Boolean,
    default: false,
  },
  imageUrl: { type: String, default: null }, // New field for image URL
  readBy: [
    {
      type: String, // Email of the users who have read the message
      match: /.+\@.+\..+/, // 🟢 Ensure it's a valid email
    },
  ],
});

// 🟢 Add compound index for sender and chatId to speed up querying
MessageSchema.index({ senderEmail: 1, chatId: 1 });

module.exports = mongoose.model("Message", MessageSchema);

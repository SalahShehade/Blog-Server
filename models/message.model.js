const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  senderEmail: { // 🟢 Renamed 'sender' to 'senderEmail' for better clarity
    type: String, 
    required: true,
  },
  receiverEmail: { // 🟢 Renamed 'receiver' to 'receiverEmail' for better clarity
    type: String, 
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
  readBy: [{ // 🟢 Optional - Track users who have read the message
    type: String // Email of the users who have read the message
  }],
});

module.exports = mongoose.model("Message", MessageSchema);

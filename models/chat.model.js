const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ChatSchema = new Schema({
  users: [{
    email: { type: String, required: true }, 
    username: { type: String, required: true }, // ✅ Added 'required: true' for better control
  }],
  shopOwner: {
    type: String, 
    required: true,
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  }],
  lastMessage: {
    type: String,
    default: null, // 🟢 Use 'null' instead of an empty string
  },
  lastMessageTime: {
    type: Date,
    default: null, // 🟢 Use 'null' if no message has been sent
  },
});

module.exports = mongoose.model("Chat", ChatSchema);

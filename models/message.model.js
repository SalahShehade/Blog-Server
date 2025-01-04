const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  senderEmail: { 
    type: String, 
    required: true,
    match: /.+\@.+\..+/,
    index: true
  },
  receiverEmail: { 
    type: String, 
    required: true,
    match: /.+\@.+\..+/,
    index: true
  },
  content: {
    type: String,
    default: '', // Make content optional if sending only images
  },
  image: {
    type: String, // URL to the image
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRead: { 
    type: Boolean,
    default: false,
  },
  readBy: [{ 
    type: String,
    match: /.+\@.+\..+/
  }]
});

// Compound index for sender and chatId
MessageSchema.index({ senderEmail: 1, chatId: 1 });

module.exports = mongoose.model("Message", MessageSchema);

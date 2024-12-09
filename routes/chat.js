const express = require("express");
const Chat = require("../models/chat.model");
const Message = require("../models/message.model");
const middleware = require("../middleware");

const router = express.Router();

// Get all chats for a user
router.get("/user-chats", middleware.checkToken, async (req, res) => {
  try {
    const userId = req.decoded.id; // User ID from JWT token
    const chats = await Chat.find({ users: userId })
      .populate('shopOwner', 'username email')
      .populate('messages');
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

// Create a chat between user and shop
router.post("/create", middleware.checkToken, async (req, res) => {
  try {
    const { shopOwnerId } = req.body;
    const userId = req.decoded.id;

    const existingChat = await Chat.findOne({ users: { $all: [userId, shopOwnerId] } });

    if (existingChat) {
      return res.status(200).json(existingChat);
    }

    const newChat = new Chat({
      users: [userId, shopOwnerId],
      shopOwner: shopOwnerId,
    });

    await newChat.save();
    res.status(201).json(newChat);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

// Send a message
router.post("/send-message", middleware.checkToken, async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const senderId = req.decoded.id;

    const message = new Message({
      chatId,
      sender: senderId,
      content,
    });

    await message.save();

    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: message._id },
      lastMessage: content,
      lastMessageTime: Date.now(),
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

module.exports = router;

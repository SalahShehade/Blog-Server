const express = require("express");
const Chat = require("../models/chat.model");
const Message = require("../models/message.model");
const middleware = require("../middleware");

const router = express.Router();

router.route("/getCustomers").get(middleware.checkToken, async (req, res) => {
  try {
    // Fetch only users and customers
    const response = await User.find(
      { role: { $in: ["customer"] } }, // Include only users with roles 'user' or 'customer'
      "email username role isBanned" // Include only these fields
    );

    console.log("Filtered Users:", response); // Log filtered response

    if (!response || response.length === 0) {
      return res.status(404).json({ message: "No users or customers found" });
    }

    return res.json({ data: response });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
});

/**
 * 🟢 Get all chats for a user
 * This route returns all chats where the current user's email is in the `users` array.
 */
router.get("/user-chats", middleware.checkToken, async (req, res) => {
  try {
    const userEmail = req.decoded.email; // Extract user email from the token

    // Find all chats where the current user's email is in the `users` array
    const chats = await Chat.find({ users: userEmail });

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

/**
 * 🟢 Create a chat between a user and a shop
 * This route creates a new chat between the current user and a shop owner.
 */
router.post("/create", middleware.checkToken, async (req, res) => {
  try {
    const { shopOwnerEmail } = req.body; // Use shopOwnerEmail from request body
    const userEmail = req.decoded.email; // Extract user's email from the token

    // Check if the chat already exists
    const existingChat = await Chat.findOne({
      users: { $all: [userEmail, shopOwnerEmail] },
    });

    if (existingChat) {
      return res.status(200).json(existingChat);
    }

    // Create a new chat document
    const newChat = new Chat({
      users: [userEmail, shopOwnerEmail], // Store emails instead of user IDs
      shopOwner: shopOwnerEmail, // Store the shop owner's email
    });

    await newChat.save();
    res.status(201).json(newChat);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

/**
 * 🟢 Send a message in a chat
 * This route allows the current user to send a message in a specific chat.
 */
router.post("/send-message", middleware.checkToken, async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const senderEmail = req.decoded.email; // Extract sender's email from the token

    // Create a new message document
    const message = new Message({
      chatId, // The chat where the message was sent
      sender: senderEmail, // Store sender's email instead of userId
      content, // The actual message content
    });

    await message.save();

    // Update the chat with the new message
    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: message._id }, // Add the message to the chat
      lastMessage: content, // Update the last message content
      lastMessageTime: Date.now(), // Update the last message time
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

/**
 * 🟢 Get all messages for a specific chat
 * This route returns all messages for a specific chat.
 */
router.get("/messages/:chatId", middleware.checkToken, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Find the chat and return all its messages
    const chat = await Chat.findById(chatId).populate("messages");

    if (!chat) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    res.status(200).json(chat.messages);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

module.exports = router;

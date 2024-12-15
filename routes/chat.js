const express = require("express");
const Chat = require("../models/chat.model");
const Message = require("../models/message.model");
const middleware = require("../middleware");
const User = require("../models/user.model");

const router = express.Router();

/**
 * 🟢 Get all chats for a user
 * This route returns all chats where the current user's email is in the `users` array.
 */
router.get("/user-chats", middleware.checkToken, async (req, res) => {
  try {
    const userEmail = req.decoded.email; // Extract user email from the token
    
    // 🔥 Step 1: Get all chats for the user
    const chats = await Chat.find({ users: userEmail });

    // 🔥 Step 2: Extract unique emails from the chats
    const uniqueEmails = [...new Set(chats.flatMap((chat) => chat.users))];
    
    // 🔥 Step 3: Get users' data from the database (just the ones in the chat)
    const usersData = await User.find({ email: { $in: uniqueEmails } });
    
    // 🔥 Step 4: Map email to username for fast lookups
    const userMap = new Map(usersData.map((user) => [user.email, user.username])); 

    // 🔥 Step 5: Enrich the chats to include the "username" of each user
    const enrichedChats = chats.map((chat) => ({
      ...chat._doc, // Spread operator to get the existing fields of the chat
      users: chat.users.map((email) => ({
        email,
        username: userMap.get(email) || "Unknown", // Get username from map, default to 'Unknown'
      })),
    }));

    // 🔥 Step 6: Send the enriched chats to the client
    res.status(200).json(enrichedChats); // ✅ Send the correct enriched version
  } catch (error) {
    console.error("❌ Error fetching user chats:", error.message);
    res.status(500).json({ msg: 'Error fetching user chats', error: error.message });
  }
});

/**
 * 🟢 Create a chat between a user and a shop
 * This route creates a new chat between the current user and a shop owner.
 */
router.post("/create", middleware.checkToken, async (req, res) => {
  try {
    const { shopOwnerEmail } = req.body; // ⭐️ Extract shopOwnerEmail from request body
    const userEmail = req.decoded.email; // ⭐️ Extract user's email from the token

    // ⭐️ Check if the shop owner exists
    const shopOwner = await User.findOne({ email: shopOwnerEmail });
    if (!shopOwner) {
      return res.status(404).json({ msg: "Shop owner not found" }); // ⭐️ Return 404 if shop owner does not exist
    }

    // ⭐️ Check if the chat already exists
    const existingChat = await Chat.findOne({
      users: { $all: [userEmail, shopOwnerEmail] },
    });

    if (existingChat) {
      // ⭐️ Populate the user data in the existing chat before returning it
      const usersData = await User.find({ email: { $in: existingChat.users } });
      const userMap = usersData.reduce((map, user) => {
        map[user.email] = user.username;
        return map;
      }, {});

      const enrichedChat = {
        ...existingChat._doc,
        users: existingChat.users.map((email) => ({
          email,
          username: userMap[email] || "Unknown",
        })),
      };

      return res.status(201).json(enrichedChat);
    }

    // ⭐️ Create a new chat document
    const newChat = new Chat({
      users: [userEmail, shopOwnerEmail], // ⭐️ Store emails instead of user IDs
      shopOwner: shopOwnerEmail, // ⭐️ Store the shop owner's email
    });

    await newChat.save();

    // ⭐️ Populate user data for the newly created chat
    const usersData = await User.find({ email: { $in: newChat.users } });
    const userMap = usersData.reduce((map, user) => {
      map[user.email] = user.username;
      return map;
    }, {});

    const enrichedChat = {
      ...newChat._doc,
      users: newChat.users.map((email) => ({
        email,
        username: userMap[email] || "Unknown",
      })),
    };

    res.status(201).json(enrichedChat); // ⭐️ Return the enriched chat instead of newChat
  } catch (error) {
    console.error("Error creating chat:", error); // ⭐️ Log the error to the server
    res.status(500).json({ msg: error.message }); // ⭐️ Return the error message
  }
});

/**
 * 🟢 Send a message in a chat
 * This route allows the current user to send a message in a specific chat.
 */
router.post("/send-message", middleware.checkToken, async (req, res) => {
  try {
    const { chatId, content, receiverEmail } = req.body; // ✅ Extract receiverEmail from request body
    const senderEmail = req.decoded.email; // Extract sender's email from the token

    // 🔥 Check if the receiverEmail is present
    if (!receiverEmail) {
      return res.status(400).json({ msg: 'Receiver email is required.' });
    }

    // 🔥 Create a new message document
    const message = new Message({
      chatId, 
      sender: senderEmail, 
      receiver: receiverEmail, // ✅ Include receiver's email
      content, 
    });

    await message.save();

    // 🔥 Update the chat with the new message
    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: message._id }, // Add the message to the chat
      lastMessage: content, // Update the last message content
      lastMessageTime: Date.now(), // ✅ Update with current date-time
    });

    // 🔥 Add the sender's username to the response
    const sender = await User.findOne({ email: senderEmail });
    const responseMessage = {
      ...message._doc,
      senderUsername: sender ? sender.username : "Unknown",
    };

    res.status(201).json(responseMessage); // ✅ Send enriched response with username
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

    // 🔥 Get all user emails from the messages
    const senderEmails = chat.messages.map((message) => message.sender);
    const usersData = await User.find({ email: { $in: senderEmails } });
    const userMap = usersData.reduce((map, user) => {
      map[user.email] = user.username;
      return map;
    }, {});

    // 🔥 Include the username in the response for each message
    const enrichedMessages = chat.messages.map((message) => ({
      ...message._doc,
      senderUsername: userMap[message.sender] || "Unknown",
    }));

    res.status(200).json(chat.messages);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

module.exports = router;

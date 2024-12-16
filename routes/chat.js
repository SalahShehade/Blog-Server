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
    
    // 🔥 Step 1: Get all chats where the user's email is part of the 'users.email'
    const chats = await Chat.find({ 'users.email': userEmail }); // ✅ Updated this query to find 'users.email'

    // 🔥 Step 2: Extract unique emails from the chats
    const uniqueEmails = [...new Set(chats.flatMap((chat) => chat.users.map(user => user.email)))];
    
    // 🔥 Step 3: Get users' data from the database (just the ones in the chat)
    const usersData = await User.find({ email: { $in: uniqueEmails } });
    
    // 🔥 Step 4: Map email to username for fast lookups
    const userMap = new Map(usersData.map((user) => [user.email, user.username])); 

    // 🔥 Step 5: Enrich the chats to include the "username" of each user
    const enrichedChats = chats.map((chat) => ({
      ...chat._doc, // Spread operator to get the existing fields of the chat
      users: chat.users.map((user) => ({
        email: user.email,
        username: userMap.get(user.email) || "Unknown", // Get username from map, default to 'Unknown'
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
    const { shopOwnerEmail } = req.body; // ✅ Extract shopOwnerEmail from request body
    const userEmail = req.decoded.email; // ✅ Extract user's email from the token

    // ✅ Check if the shop owner exists
    const shopOwner = await User.findOne({ email: shopOwnerEmail });
    const currentUser = await User.findOne({ email: userEmail });

    if (!shopOwner) {
      return res.status(404).json({ msg: "Shop owner not found" }); // ✅ Return 404 if shop owner does not exist
    }

    if (!currentUser) {
      return res.status(404).json({ msg: "User not found" }); // ✅ Return 404 if the current user does not exist
    }

    // ✅ Check if the chat already exists
    const existingChat = await Chat.findOne({ 
      'users.email': { $all: [userEmail, shopOwnerEmail] } 
    });

    if (existingChat) {
      // ✅ Populate the user data for the existing chat
      const usersData = await User.find({ email: { $in: existingChat.users.map(u => u.email) } });
      const userMap = usersData.reduce((map, user) => {
        map[user.email] = user.username;
        return map;
      }, {});

      const enrichedChat = {
        ...existingChat._doc,
        users: existingChat.users.map((user) => ({
          email: user.email,
          username: userMap[user.email] || "Unknown",
        })),
      };

      return res.status(200).json(enrichedChat); // ✅ Use 200 for "chat already exists"
    }

    // ✅ Create a new chat document
    const newChat = new Chat({
      users: [
        { email: userEmail, username: currentUser.username }, 
        { email: shopOwnerEmail, username: shopOwner.username }
      ],
      shopOwner: shopOwnerEmail 
    });

    await newChat.save();

    // ✅ Populate user data for the newly created chat
    const usersData = await User.find({ email: { $in: newChat.users.map(u => u.email) } });
    const userMap = usersData.reduce((map, user) => {
      map[user.email] = user.username;
      return map;
    }, {});

    const enrichedChat = {
      ...newChat._doc,
      users: newChat.users.map((user) => ({
        email: user.email,
        username: userMap[user.email] || "Unknown",
      })),
    };

    res.status(201).json(enrichedChat); // ✅ Return the enriched chat with a 201 status
  } catch (error) {
    console.error("❌ Error creating chat:", error); // ✅ Log the error for debugging
    res.status(500).json({ msg: 'Internal server error', error: error.message }); // ✅ Avoid exposing raw error messages to clients
  }
});



/**
 * 🟢 Send a message in a chat
 * This route allows the current user to send a message in a specific chat.
 */
router.post("/send-message", middleware.checkToken, async (req, res) => {
  try {
    const { chatId, content, receiverEmail } = req.body; // ✅ Extract receiverEmail from request body
    const senderEmail = req.decoded.email; // ✅ Extract sender's email from the token

    // 🛠️ **Debug Log** — Log to see if the data is being received properly
    console.log(`Creating message with content: ${content} | Chat ID: ${chatId} | Sender: ${senderEmail} | Receiver: ${receiverEmail}`);

    // 🔥 Check if the required fields are present
    if (!chatId) {
      return res.status(400).json({ msg: 'Chat ID is required.' });
    }
    if (!content) {
      return res.status(400).json({ msg: 'Message content is required.' });
    }
    if (!receiverEmail) {
      return res.status(400).json({ msg: 'Receiver email is required.' });
    }

    // 🔥 Check if the chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ msg: 'Chat not found.' });
    }

    // 🔥 Check if the receiver is a participant in the chat
    const isReceiverInChat = chat.users.some(user => user.email === receiverEmail);
    if (!isReceiverInChat) {
      return res.status(400).json({ msg: 'Receiver is not a participant in this chat.' });
    }

    // 🔥 Create a new message document
    const message = new Message({
      chatId, 
      senderEmail, 
      receiverEmail, 
      content, 
      timestamp: Date.now() // ✅ Ensure timestamp is explicitly added
    });

    await message.save();

    // 🔥 Update the chat with the new message
    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: message._id }, // Add the message to the chat
      lastMessage: content, // Update the last message content
      lastMessageTime: Date.now(), // ✅ Update with current date-time
    });

    console.log(`✅ Message created successfully: ${message}`); // 🛠️ Log the message for debugging

    res.status(201).json({ 
      msg: 'Message sent successfully', 
      messageData: message 
    });
  } catch (error) {
    console.error("❌ Error in /send-message route: ", error);
    res.status(500).json({ msg: 'Internal server error', error: error.message });
  }
});




/**
 * 🟢 Get all messages for a specific chat
 * This route returns all messages for a specific chat.
 */
router.get("/messages/:chatId", middleware.checkToken, async (req, res) => {
  try {
    const { chatId } = req.params;

    // ✅ Check if the chat exists and populate its messages
    const chat = await Chat.findById(chatId).populate("messages");

    if (!chat) {
      return res.status(404).json({ msg: "Chat not found" }); // ✅ Return 404 if chat not found
    }

    // ✅ Get all user emails from the messages
    const senderEmails = chat.messages.map((message) => message.sender);
    const uniqueEmails = [...new Set(senderEmails)]; // ✅ Ensure no duplicates for efficient lookup

    // ✅ Find user data for senders
    const usersData = await User.find({ email: { $in: uniqueEmails } });
    const userMap = usersData.reduce((map, user) => {
      map[user.email] = user.username; // ✅ Map sender's email to username
      return map;
    }, {});

    // ✅ Attach sender usernames to each message
    const enrichedMessages = chat.messages.map((message) => ({
      ...message._doc, // Spread all existing message data
      senderUsername: userMap[message.sender] || "Unknown", // ✅ Attach username from the userMap
    }));

    res.status(200).json(enrichedMessages); // ✅ Return the enriched messages
  } catch (error) {
    console.error("❌ Error fetching messages for chat:", error.message); // ✅ Log the error on the server
    res.status(500).json({ msg: 'Internal server error', error: error.message }); // ✅ Send back proper error message
  }
});


module.exports = router;

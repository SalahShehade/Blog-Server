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

    // Find all chats where the current user's email is in the `users` array
    const chats = await Chat.find({ users: userEmail });

    const usersData = await User.find({ email: { $in: chats.flatMap(chat => chat.users) } });
    const userMap = usersData.reduce((map, user) => {
      map[user.email] = user.username; // Map email to username
      return map;
    }, {});

    const enrichedChats = chats.map(chat => ({
      ...chat._doc,
      users: chat.users.map(email => ({
        email,
        username: userMap[email] || 'Unknown' // Get the username from the map or 'Unknown'
      })),
    }));


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
    const { shopOwnerEmail } = req.body; // ⭐️ Extract shopOwnerEmail from request body
    const userEmail = req.decoded.email; // ⭐️ Extract user's email from the token

    // ⭐️ Check if the shop owner exists
    const shopOwner = await User.findOne({ email: shopOwnerEmail });
    if (!shopOwner) {
      return res.status(404).json({ msg: "Shop owner not found" }); // ⭐️ Return 404 if shop owner does not exist
    }

    // ⭐️ Check if the chat already exists
    const existingChat = await Chat.findOne({ users: { $all: [userEmail, shopOwnerEmail] } });

    if (existingChat) {
      // ⭐️ Populate the user data in the existing chat before returning it
      const usersData = await User.find({ email: { $in: existingChat.users } });
      const userMap = usersData.reduce((map, user) => {
        map[user.email] = user.username;
        return map;
      }, {});

      const enrichedChat = {
        ...existingChat._doc,
        users: existingChat.users.map(email => ({
          email,
          username: userMap[email] || 'Unknown'
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
      users: newChat.users.map(email => ({
        email,
        username: userMap[email] || 'Unknown'
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
      lastMessageTime: null, // Update the last message time
    });

     // 🔥 Add the sender's username to the response
     const sender = await User.findOne({ email: senderEmail });
     const responseMessage = {
       ...message._doc,
       senderUsername: sender ? sender.username : 'Unknown',
     };

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
    const chat = await Chat.findById(chatId).populate('messages');
    
    if (!chat) {
      return res.status(404).json({ msg: 'Chat not found' });
    }

        // 🔥 Get all user emails from the messages
        const senderEmails = chat.messages.map(message => message.sender);
        const usersData = await User.find({ email: { $in: senderEmails } });
        const userMap = usersData.reduce((map, user) => {
          map[user.email] = user.username;
          return map;
        }, {});
    
        // 🔥 Include the username in the response for each message
        const enrichedMessages = chat.messages.map(message => ({
          ...message._doc,
          senderUsername: userMap[message.sender] || 'Unknown'
        }));
    

    res.status(200).json(chat.messages);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

module.exports = router;

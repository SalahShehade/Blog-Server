const express = require("express");
const Chat = require("../models/chat.model");
const Message = require("../models/message.model");
const middleware = require("../middleware");
const User = require("../models/user.model");
const io = require("../socket"); // Ensure socket.js is exporting the io instance
const router = express.Router();
//
/**
 * 🟢 Get all chats for a user
 * This route returns all chats where the current user's email is in the `users` array.
 */


// chat.js

const multer = require("multer");
const upload = multer({ dest: "uploads/audio/" });

// POST /chat/send-audio
router.post(
  "/send-audio",
  middleware.checkToken,
  upload.single("audioFile"), // "audioFile" is the field name from Flutter
  async (req, res) => {
    try {
      const { chatId, receiverEmail } = req.body;
      const senderEmail = req.decoded.email;

      // 1) Make sure file is present
      if (!req.file) {
        return res.status(400).json({ msg: "No audio file uploaded." });
      }

      // 2) Build file URL
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/audio/${req.file.filename}`;

      // 3) Create new message in Mongo
      const message = new Message({
        chatId,
        senderEmail,
        receiverEmail,
        content: fileUrl, // We'll store the audio URL in "content"
        timestamp: Date.now(),
      });
      await message.save();

      // 4) Update chat with the new message
      await Chat.findByIdAndUpdate(chatId, {
        $push: { messages: message._id },
        lastMessage: "[Audio Message]", // Optional
        lastMessageTime: Date.now(),
      });

      // 5) Emit real-time event via Socket.IO
      const io = req.app.get("io");
      if (io) {
        const enrichedMessage = {
          _id: message._id,
          chatId,
          senderEmail,
          receiverEmail,
          content: fileUrl,  // The audio URL
          timestamp: message.timestamp,
        };
        io.to(chatId).emit("receive_message_individual", enrichedMessage);
      }

      // 6) Send response to client
      return res.status(201).json({
        msg: "Audio message sent successfully",
        data: {
          chatId,
          content: fileUrl,
        },
      });
    } catch (error) {
      console.error("❌ Error sending audio message:", error);
      res.status(500).json({ msg: "Server error", error: error.message });
    }
  }
);













router.get("/user-chats", middleware.checkToken, async (req, res) => {
  try {
    const userEmail = req.decoded.email; // Extract user email from the token

    // 🔥 Step 1: Get all chats where the user's email is part of the 'users.email'
    const chats = await Chat.find({ "users.email": userEmail }).sort({
      lastMessageTime: -1,
    });

    // 🔥 Step 2: Extract unique emails from the chats
    const uniqueEmails = [
      ...new Set(chats.flatMap((chat) => chat.users.map((user) => user.email))),
    ];

    // 🔥 Step 3: Get users' data from the database (just the ones in the chat)
    const usersData = await User.find({ email: { $in: uniqueEmails } });

    // 🔥 Step 4: Map email to username for fast lookups
    const userMap = new Map(
      usersData.map((user) => [user.email, user.username])
    );

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
    res
      .status(500)
      .json({ msg: "Error fetching user chats", error: error.message });
  }
});

/**
 * 🟢 Check if a chat already exists between the logged-in user and the given partner
 */
router.get("/existing", middleware.checkToken, async (req, res) => {
  try {
    const userEmail = req.decoded.email;
    const partnerEmail = req.query.partnerEmail;

    if (!partnerEmail) {
      return res.status(400).json({ msg: "partnerEmail is required" });
    }

    // Check if there's a chat involving both userEmail and partnerEmail
    const existingChat = await Chat.findOne({
      "users.email": { $all: [userEmail, partnerEmail] },
    });

    if (!existingChat) {
      // No existing chat found
      return res.status(200).json({ msg: "No existing chat found" });
    }

    // Return the chat ID if found
    return res.status(200).json({ _id: existingChat._id });
  } catch (error) {
    console.error("❌ Error checking existing chat:", error.message);
    res
      .status(500)
      .json({ msg: "Internal server error", error: error.message });
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
      "users.email": { $all: [userEmail, shopOwnerEmail] },
    });

    if (existingChat) {
      // ✅ Populate the user data for the existing chat
      const usersData = await User.find({
        email: { $in: existingChat.users.map((u) => u.email) },
      });
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
        { email: shopOwnerEmail, username: shopOwner.username },
      ],
      shopOwner: shopOwnerEmail,
    });

    await newChat.save();

    // ✅ Populate user data for the newly created chat
    const usersData = await User.find({
      email: { $in: newChat.users.map((u) => u.email) },
    });
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

    // 🔥 **Emit event for users to join this new chat room**
    const io = req.app.get("io"); // ✅ Access socket.io instance
    //io.to(userEmail).emit('join_chat', enrichedChat._id); // 🔥 Emit event to the user to join the new chat
    //io.to(shopOwnerEmail).emit('join_chat', enrichedChat._id); // 🔥 Emit event to the shop owner to join the chat

    res.status(201).json(enrichedChat); // ✅ Return the enriched chat with a 201 status
  } catch (error) {
    console.error("❌ Error creating chat:", error); // ✅ Log the error for debugging
    res
      .status(500)
      .json({ msg: "Internal server error", error: error.message }); // ✅ Avoid exposing raw error messages to clients
  }
});

/**
 * 🟢 Send a message in a chat
 * This route allows the current user to send a message in a specific chat.
 */
router.post("/send-message", middleware.checkToken, async (req, res) => {
  try {
    const { chatId, content, receiverEmail } = req.body;
    const senderEmail = req.decoded.email;

    // 🛠️ **Debug Log** — Log to see if the data is being received properly
    console.log(
      `📩 Creating message with content: ${content} | Chat ID: ${chatId} | Sender: ${senderEmail} | Receiver: ${receiverEmail}`
    );

    // 🔥 Check if the required fields are present
    if (!chatId) {
      return res.status(400).json({ msg: "Chat ID is required." });
    }
    if (!content) {
      return res.status(400).json({ msg: "Message content is required." });
    }
    if (!receiverEmail) {
      return res.status(400).json({ msg: "Receiver email is required." });
    }

    // 🔥 Check if the chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ msg: "Chat not found." });
    }

    // 🔥 Check if the receiver is a participant in the chat
    const isReceiverInChat = chat.users.some(
      (user) => user.email === receiverEmail
    );
    if (!isReceiverInChat) {
      return res
        .status(400)
        .json({ msg: "Receiver is not a participant in this chat." });
    }

    // 🔥 Create a new message document
    const message = new Message({
      chatId,
      senderEmail,
      receiverEmail,
      content,
      timestamp: Date.now(),
    });

    // ✅ Save the message first
    await message.save();

    // 🔥 Update the chat with the new message
    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: message._id },
      lastMessage: content,
      lastMessageTime: Date.now(),
    });

    console.log(`✅ Message created successfully: ${message}`);

    // 🔥 Access the socket.io instance
    const io = req.app.get("io");
    if (!io) {
      console.error("❌ Socket.io instance not available.");
      return res
        .status(500)
        .json({ msg: "Internal server error: Socket.io instance is missing." });
    }

    // 🔥 Enrich the message data before emitting
    const sender = await User.findOne({ email: senderEmail });
    const enrichedMessage = {
      _id: message._id,
      chatId: message.chatId,
      senderEmail: message.senderEmail,
      senderUsername: sender ? sender.username : "Unknown", // 🔥 Add sender username
      receiverEmail: message.receiverEmail,
      content: message.content,
      timestamp: message.timestamp,
    };

    // 🔥 Emit message to all users in the chat room
    try {
      // io.to(chatId).emit('receive_message', enrichedMessage);

      io.to(chatId).emit("receive_message_chatpage", enrichedMessage);
      io.to(chatId).emit("receive_message_individual", enrichedMessage);

      console.log("✅ Real-time message emitted successfully.");
    } catch (error) {
      console.error("❌ Error emitting real-time message:", error);
    }

    res.status(201).json({
      msg: "Message sent successfully",
      messageData: enrichedMessage, // Return enriched message data to the client
    });
  } catch (error) {
    console.error("❌ Error in /send-message route: ", error);
    res
      .status(500)
      .json({ msg: "Internal server error", error: error.message });
  }
});

router.patch("/delete-message", middleware.checkToken, async (req, res) => {
  try {
    const { messageId } = req.body;
    const userEmail = req.decoded.email;

    if (!messageId) {
      return res.status(400).json({ msg: "messageId is required." });
    }

    // Find the message by ID
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found." });
    }

    // Ensure the requester is the sender of the message
    if (message.senderEmail !== userEmail) {
      return res
        .status(403)
        .json({ msg: "Unauthorized to delete this message." });
    }

    // Update the message content to an empty string
    message.content = "";
    await message.save();

    // Emit the update to all clients in the chat room
    const io = req.app.get("io");
    if (io) {
      io.to(message.chatId.toString()).emit("update_message", {
        _id: message._id,
        content: message.content,
      });
    }

    res.status(200).json({ msg: "Message deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting message:", error.message);
    res.status(500).json({ msg: "Internal server error.", error: error.message });
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
    res
      .status(500)
      .json({ msg: "Internal server error", error: error.message }); // ✅ Send back proper error message
  }
});

module.exports = router;

const express = require("express");
const Chat = require("../models/chat.model");
const Message = require("../models/message.model");
const middleware = require("../middleware");
const User = require("../models/user.model");
const io = require("../socket"); // Ensure socket.js is exporting the io instance
const router = express.Router();

//comment for testing firebase storage
// 1) Bring in multer + path + admin
const multer = require("multer");
const path = require("path");
const admin = require("../firebase");

// 2) Configure Firebase bucket reference (same as in profile.js)
const bucket = admin.storage().bucket("hajziapp.firebasestorage.app");

// 3) Switch to memoryStorage so we can upload directly to Firebase
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10 MB (adjust as needed)
  },
  // If you only want certain audio types, uncomment and adjust the fileFilter:
  // fileFilter: (req, file, cb) => {
  //   if (file.mimetype === "audio/mpeg" || file.mimetype === "audio/wav") {
  //     cb(null, true);
  //   } else {
  //     cb(new Error("Unsupported file format"), false);
  //   }
  // },
});

// 4) Helper function to upload file to Firebase Storage (same logic as profile.js)
const uploadFileToFirebase = async (file, destination) => {
  try {
    const fileUpload = bucket.file(destination);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      stream.on("error", (err) => {
        reject(new Error("Error uploading to Firebase: " + err.message));
      });

      stream.on("finish", async () => {
        try {
          await fileUpload.makePublic();
          console.log(`File ${destination} is now public.`);
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
          resolve(publicUrl);
        } catch (err) {
          console.error(`Failed to make file public: ${err}`);
          reject(new Error("Error making file public: " + err.message));
        }
      });

      // End the stream by writing the file buffer
      stream.end(file.buffer);
    });
  } catch (error) {
    console.error("Error uploading audio file to Firebase:", error);
    throw error;
  }
};

/**
 * POST /chat/send-audio
 * Uploads audio to Firebase, creates a Message with the public URL,
 * pushes message to the Chat, and emits via Socket.IO
 */
router.post(
  "/send-audio",
  middleware.checkToken,
  upload.single("audioFile"), // "audioFile" is the field name from Flutter
  async (req, res) => {
    try {
      const { chatId, receiverEmail } = req.body;
      const senderEmail = req.decoded.email;

      // 1) Ensure file is present
      if (!req.file) {
        return res.status(400).json({ msg: "No audio file uploaded." });
      }

      // 2) Build a Firebase path (mimic your profile.js logic)
      const ext = path.extname(req.file.originalname); // e.g. ".mp3"
      const timestamp = Date.now();
      const firebasePath = `chatAudio/${senderEmail}-${timestamp}${ext}`;

      // 3) Upload to Firebase & get the public URL
      const publicUrl = await uploadFileToFirebase(req.file, firebasePath);

      // 4) Create new message in Mongo with the publicUrl
      const message = new Message({
        chatId,
        senderEmail,
        receiverEmail,
        content: publicUrl, // Store the public URL in "content"
        timestamp: Date.now(),
      });
      await message.save();

      // 5) Update chat with the new message
      await Chat.findByIdAndUpdate(chatId, {
        $push: { messages: message._id },
        lastMessage: "[Audio Message]", // optional
        lastMessageTime: Date.now(),
      });

      // 6) Emit real-time event via Socket.IO
      const io = req.app.get("io");
      if (io) {
        const enrichedMessage = {
          _id: message._id,
          chatId,
          senderEmail,
          receiverEmail,
          content: publicUrl, // The Firebase audio URL
          timestamp: message.timestamp,
        };
        io.to(chatId).emit("receive_message_individual", enrichedMessage);
      }

      // 7) Send response to client
      return res.status(201).json({
        msg: "Audio message sent successfully",
        data: {
          chatId,
          content: publicUrl,
        },
      });
    } catch (error) {
      console.error("❌ Error sending audio message:", error);
      res.status(500).json({ msg: "Server error", error: error.message });
    }
  }
);

/**
 * 🟢 Get all chats for a user
 * This route returns all chats where the current user's email is in the `users` array.
 */
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

    // 🔥 Step 3: Get users' data from the database
    const usersData = await User.find({ email: { $in: uniqueEmails } });

    // 🔥 Step 4: Map email to username
    const userMap = new Map(
      usersData.map((user) => [user.email, user.username])
    );

    // 🔥 Step 5: Enrich the chats to include the "username" of each user
    const enrichedChats = chats.map((chat) => ({
      ...chat._doc,
      users: chat.users.map((user) => ({
        email: user.email,
        username: userMap.get(user.email) || "Unknown",
      })),
    }));

    // 🔥 Step 6: Send the enriched chats
    res.status(200).json(enrichedChats);
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
 */
router.post("/create", middleware.checkToken, async (req, res) => {
  try {
    const { shopOwnerEmail } = req.body;
    const userEmail = req.decoded.email;

    // Check if the shop owner exists
    const shopOwner = await User.findOne({ email: shopOwnerEmail });
    const currentUser = await User.findOne({ email: userEmail });

    if (!shopOwner) {
      return res.status(404).json({ msg: "Shop owner not found" });
    }
    if (!currentUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if the chat already exists
    const existingChat = await Chat.findOne({
      "users.email": { $all: [userEmail, shopOwnerEmail] },
    });

    if (existingChat) {
      // Populate the user data for the existing chat
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

      return res.status(200).json(enrichedChat);
    }

    // Create a new chat document
    const newChat = new Chat({
      users: [
        { email: userEmail, username: currentUser.username },
        { email: shopOwnerEmail, username: shopOwner.username },
      ],
      shopOwner: shopOwnerEmail,
    });
    await newChat.save();

    // Populate user data for the newly created chat
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

    // 🔥 Emit event for users to join this new chat room (optional)
    const io = req.app.get("io");
    // io.to(userEmail).emit('join_chat', enrichedChat._id);
    // io.to(shopOwnerEmail).emit('join_chat', enrichedChat._id);

    res.status(201).json(enrichedChat);
  } catch (error) {
    console.error("❌ Error creating chat:", error);
    res
      .status(500)
      .json({ msg: "Internal server error", error: error.message });
  }
});

/**
 * 🟢 Send a message in a chat
 */
router.post("/send-message", middleware.checkToken, async (req, res) => {
  try {
    const { chatId, content, receiverEmail } = req.body;
    const senderEmail = req.decoded.email;

    console.log(
      `📩 Creating message with content: ${content} | Chat ID: ${chatId} | Sender: ${senderEmail} | Receiver: ${receiverEmail}`
    );

    if (!chatId) {
      return res.status(400).json({ msg: "Chat ID is required." });
    }
    if (!content) {
      return res.status(400).json({ msg: "Message content is required." });
    }
    if (!receiverEmail) {
      return res.status(400).json({ msg: "Receiver email is required." });
    }

    // Check if the chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ msg: "Chat not found." });
    }

    // Check if the receiver is a participant in the chat
    const isReceiverInChat = chat.users.some(
      (user) => user.email === receiverEmail
    );
    if (!isReceiverInChat) {
      return res
        .status(400)
        .json({ msg: "Receiver is not a participant in this chat." });
    }

    // Create a new message document
    const message = new Message({
      chatId,
      senderEmail,
      receiverEmail,
      content,
      timestamp: Date.now(),
    });
    await message.save();

    // Update the chat with the new message
    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: message._id },
      lastMessage: content,
      lastMessageTime: Date.now(),
    });

    console.log(`✅ Message created successfully: ${message}`);

    // Emit real-time message
    const io = req.app.get("io");
    if (!io) {
      console.error("❌ Socket.io instance not available.");
      return res
        .status(500)
        .json({ msg: "Internal server error: Socket.io instance is missing." });
    }

    // Enrich the message data before emitting
    const sender = await User.findOne({ email: senderEmail });
    const enrichedMessage = {
      _id: message._id,
      chatId: message.chatId,
      senderEmail: message.senderEmail,
      senderUsername: sender ? sender.username : "Unknown",
      receiverEmail: message.receiverEmail,
      content: message.content,
      timestamp: message.timestamp,
    };

    try {
      io.to(chatId).emit("receive_message_chatpage", enrichedMessage);
      io.to(chatId).emit("receive_message_individual", enrichedMessage);

      console.log("✅ Real-time message emitted successfully.");
    } catch (error) {
      console.error("❌ Error emitting real-time message:", error);
    }

    res.status(201).json({
      msg: "Message sent successfully",
      messageData: enrichedMessage,
    });
  } catch (error) {
    console.error("❌ Error in /send-message route: ", error);
    res
      .status(500)
      .json({ msg: "Internal server error", error: error.message });
  }
});

/**
 * 🟢 Delete a message (by setting its content to "")
 */
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

    // Ensure the requester is the sender
    if (message.senderEmail !== userEmail) {
      return res
        .status(403)
        .json({ msg: "Unauthorized to delete this message." });
    }

    // Update the message content
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
 */
router.get("/messages/:chatId", middleware.checkToken, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Check if the chat exists and populate its messages
    const chat = await Chat.findById(chatId).populate("messages");
    if (!chat) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    // Get all user emails from the messages
    const senderEmails = chat.messages.map((message) => message.sender);
    const uniqueEmails = [...new Set(senderEmails)];

    // Find user data for senders
    const usersData = await User.find({ email: { $in: uniqueEmails } });
    const userMap = usersData.reduce((map, user) => {
      map[user.email] = user.username;
      return map;
    }, {});

    // Attach sender usernames to each message
    const enrichedMessages = chat.messages.map((message) => ({
      ...message._doc,
      senderUsername: userMap[message.sender] || "Unknown",
    }));

    res.status(200).json(enrichedMessages);
  } catch (error) {
    console.error("❌ Error fetching messages for chat:", error.message);
    res
      .status(500)
      .json({ msg: "Internal server error", error: error.message });
  }
});

module.exports = router;

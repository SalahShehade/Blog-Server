const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
var http = require("http");
const { Server } = require("socket.io"); // ✅ New line for Socket.IO Server import
const chatRoutes = require("./routes/chat"); // ✅ New line for chat routes import
const Chat = require("./models/chat.model"); // ✅ Import Chat model
const Message = require("./models/message.model"); // ✅ Import Message model


//hello world
//const PORT = process.env.port || 5000;
const app = express(); //
// const PORT = app.listen(process.env.PORT || 5000, function () { ✅ comment for not needed
//   console.log(
//     "Express server listening on port %d in %s mode",
//     this.address().port,
//     app.settings.env
//   );
// });

//new
//

app.use((req, res, next) => {
  if (req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(`https://${req.hostname}${req.url}`);
  }
  next();
});

var server = http.createServer(app);
server.listen(process.env.PORT || 5000, () => {
  console.log("✅ Server is running on port", process.env.PORT || 5000);
});

//

const events = require("events");
events.EventEmitter.defaultMaxListeners = 15; // Increase the limit to 15 or more as needed

//app.use(cors({ origin: "http://localhost:57308" })); // Replace with your web app's URL
app.use(cors({ origin: "*" })); // Allow requests from any origin

mongoose.connect(
  "mongodb+srv://Abdallah:12345@cluster0.njict.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/myapp"
);

const connection = mongoose.connection;
connection.once("open", () => console.log("MongoDB connected"));
connection.on("error", (error) =>
  console.error("MongoDB connection error:", error)
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
//middleware
//app.use("/uploads", express.static("uploads"));
app.use(express.json()); // to help nodeJs understand json data
const userRoute = require("./routes/user.js");
app.use("/user", userRoute);

const notificationsRoute = require("./routes/notifications.js");
app.use("/notifications", notificationsRoute);

const profileRoute = require("./routes/profile.js");
app.use("/profile", profileRoute);

const AddBlogApprovalRoute = require("./routes/AddBlogApproval.js");
app.use("/AddBlogApproval", AddBlogApprovalRoute);

const blogRoute = require("./routes/blogpost.js");
app.use("/blogpost", blogRoute);

const appointmentRoute = require("./routes/appointment.js");
app.use("/appointment", appointmentRoute);

app
  .route("/")
  .get((req, res) =>
    res.json("Welcome to my Hajzi app. Have fun with Booking freely!!")
  );

// app.listen(PORT, "0.0.0.0", () =>
//   console.log("Welcome your listening at port: " + PORT) 🔥 comment for not needed
// );

// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

// 2️⃣ **Add Chat Routes**
app.use("/chat", chatRoutes); // ✅ Register the chat routes

// 3️⃣ **Socket.IO Setup for Real-Time Chat**
const initSocketServer = (server) => {
  // ✅ Attach Socket.IO to the existing server
  const io = new Server(server, {
    path: "/socket.io", 
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // ✅ Attach Socket.IO instance to the app for access in route files
  app.set('io', io); // 🔥 Attach Socket.IO instance to the Express app

  // ✅ Handle Socket.IO Connection
  io.on("connection", (socket) => {
    console.log(`✅ A user connected with ID: ${socket.id}`);

    // 🔥 Listen for "join_chat" event to join a specific room
    socket.on("join_chat", (chatId) => {
      try {
        if (!chatId) throw new Error("Chat ID is required to join a chat room");
        socket.join(chatId); // Join the room with the given chatId
        console.log(`📢 User with ID: ${socket.id} joined chat: ${chatId}`);
      } catch (error) {
        console.error("Error joining chat:", error.message);
        socket.emit('error', { msg: 'Error joining chat', error: error.message }); // Send error back to the client
      }
    });

    // 🔥 Listen for "send_message" event to handle messages
    socket.on("send_message", async (data) => {
      try {
        const { chatId, senderEmail, content, receiverEmail } = data; // 🔥 Added 'receiverEmail' to the destructuring

        // 🔥 Validate inputs
        if (!chatId || !senderEmail || !content || !receiverEmail)
          throw new Error("Missing required fields in send_message");

        // 🔥 Save the message in the database
        const message = new Message({
          chatId,
          senderEmail,
          receiverEmail,
          content,
          timestamp: Date.now() // Explicitly add timestamp
        });
        await message.save();

        // 🔥 Update the last message in the chat document
        await Chat.findByIdAndUpdate(chatId, {
          $push: { messages: message._id },
          lastMessage: content,
          lastMessageTime: Date.now(),
        });

        // 🔥 Emit the message to all users in the room (real-time update)
        io.to(chatId).emit("receive_message", {
          _id: message._id,
          chatId: message.chatId,
          senderEmail: message.senderEmail,
          receiverEmail: message.receiverEmail,
          content: message.content,
          timestamp: message.timestamp,
        });

        console.log(
          `📢 New message in chat ${chatId} from ${senderEmail} to ${receiverEmail}: ${content}`
        );
      } catch (error) {
        console.error("Error sending message:", error.message);
        socket.emit('error', { msg: 'Error sending message', error: error.message }); // Send error back to the client
      }
    });

    // 🔥 Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`❌ User with ID: ${socket.id} disconnected`);
    });
  });

  // 🔥 Handle global socket errors (like disconnections or connection issues)
  io.on("error", (error) => {
    console.error("❌ Global Socket.IO Error:", error.message);
  });
};

initSocketServer(server); // ✅ Call initSocketServer to attach socket.io to the server

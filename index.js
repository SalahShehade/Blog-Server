const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

//hello world
const PORT = process.env.PORT || 5000;
const port1 = process.env.PORT || 5001; //
const app = express();
const cors = require("cors"); //
//new
var http = require("http"); //
var server = http.createServer(app);
var io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
}); //

const events = require("events");
events.EventEmitter.defaultMaxListeners = 15; // Increase the limit to 15 or more as needed

//app.use(cors({ origin: "http://localhost:57308" })); // Replace with your web app's URL
app.use(cors({ origin: "*" })); // Allow requests from any origin

io.on("connection", (socket) => {
  console.log("connected");
  console.log(socket.id, "has joined");
  socket.on("/test", (msg) => {
    console.log(msg);
  });
}); //

server.listen(port1, "0.0.0.0", () => {
  console.log("server connected");
  console.log("");
}); //

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

app
  .route("/")
  .get((req, res) =>
    res.json("Welcome to my Hajzi app. Have fun with Booking freely!!")
  );

app.listen(PORT, "0.0.0.0", () =>
  console.log("Welcome your listening at port: " + PORT)
);

const admin = require("firebase-admin");
const path = require("path");
const cors = require("cors");
const express = require("express");
const app = express();
app.use(cors());
// Initialize Firebase Admin
const serviceAccount = require(path.join(
  __dirname,
  "keys/hajziapp-firebase-adminsdk-oilsf-7b76365cd4.json"
));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "hajziapp.firebasestorage.app", // Replace with your bucket name
});

// Export the admin instance
module.exports = admin;

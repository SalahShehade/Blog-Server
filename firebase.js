const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require(path.join(
  __dirname,
  "keys/hajziapp-firebase-adminsdk-oilsf-7b76365cd4.json"
));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "hajziapp.appspot.com", // Correct Firebase Storage bucket name
});

// Export the admin instance
module.exports = admin;

const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();

// Function to fetch admin tokens from your database (replace this with your actual logic)
async function getAdminTokens() {
  // Example: Fetch tokens from your database
  return [
    "caOCqClzTi6i_ig1FBJoqO:APA91bGMy6rloGDKUsxRjnoSkOYpIM7AQPNNsiQFNG0fN3zdpz-zb6OVwplzG7yPdjGEv6VSlHvH-kvcAYJEuT39uME7GZZHpSd9p9S-Un5S3B_BJW5fgtU",
  ]; // Replace with actual token-fetching logic
}

// Initialize Firebase Admin
const serviceAccount = require("../keys/hajzi-d17f3-firebase-adminsdk-hwhrj-fdad7d6150.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Define the notifyAdmins route
router.post("/notifyAdmins/:email", async (req, res) => {
  const email = req.params.email;
  console.log("Email parameter received:", email);

  try {
    const adminTokens = await getAdminTokens();
    console.log("Admin tokens fetched:", adminTokens);

    if (adminTokens.length > 0) {
      const message = {
        notification: {
          title: "New Blog Submission",
          body: `User with email ${email} has submitted a blog for approval.`,
        },
        data: {
          type: "blog_approval",
          email: email,
        },
      };

      const promises = adminTokens.map((token) =>
        admin.messaging().send({ ...message, token })
      );

      await Promise.all(promises);
      console.log("Notifications sent successfully");
      return res
        .status(200)
        .json({ success: true, message: "Notifications sent successfully." });
    } else {
      console.warn("No admin tokens found.");
      return res
        .status(404)
        .json({ success: false, message: "No admin tokens found." });
    }
  } catch (error) {
    console.error("Error in notifyAdmins route:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send notifications.",
      error,
    });
  }
});
module.exports = router;

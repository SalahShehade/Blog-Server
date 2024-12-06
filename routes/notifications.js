const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();

// Function to fetch admin tokens from your database (replace this with your actual logic)
async function getAdminTokens() {
  // Example: Fetch tokens from your database
  return [
    "eo5zg664SOKM-6QDm09wIA:APA91bG8wrRTW5PnxBtTjEQNRd159j2gZPeLlB2vlG1pVIYceZai6Ar7g53sa1vxDzv5vqEvurKWy49wDO-__6rz3hcQcgoARe0ZXlQzh4L_KE-Gc7uLiMo",
    "eD24dMxtQKqfgzZ1kjH9Ft:APA91bEzB5bpDj3AbojOiJcOLvY6FyRBCQFzt3lYwr_bDQl8UnKH8_ticEP20NLSNkJVGQc-SF7O7x5tWglI7pzeSrljlO-UnUe7QqjaretwmAILPFrxOFU",
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

// Define the notifyAdmins route
router.post("/notifyAdmins/customer/:email", async (req, res) => {
  const email = req.params.email;
  console.log("Email parameter received:", email);

  try {
    const adminTokens = await getAdminTokens();
    console.log("Admin tokens fetched:", adminTokens);

    if (adminTokens.length > 0) {
      const message = {
        notification: {
          title: "New Payment",
          body: `User with email ${email} has successfully upgraded to Agent.`,
        },
        data: {
          type: "agent_approval",
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

// Define the notifyAdmins route
router.post("/notifyAdmins/updateShop/:email/:id", async (req, res) => {
  const email = req.params.email;
  const id = req.params.id;
  console.log("Email parameter received:", email);

  try {
    const adminTokens = await getAdminTokens();
    console.log("Admin tokens fetched:", adminTokens);

    if (adminTokens.length > 0) {
      const message = {
        notification: {
          title: "New Adjustment",
          body: `User with Email: ${email} has updated his Shop with ID: ${id}`,
        },
        data: {
          type: "agent_editShop",
          email: email,
          id: id,
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

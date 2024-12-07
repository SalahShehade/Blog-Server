const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();

// Function to fetch admin tokens from your database (replace this with your actual logic)
async function getAdminTokens() {
  // Example: Fetch tokens from your database
  return [
    "fGxtROI4T1KxEcSkOwAGWb:APA91bGJDyFqu1BGovrDEs2ZOAJ4X4kXFxrGQx2I0_-bnrou7YfPyQYT-CQrl8Zd01Be9fYo9VZNDdIfkURNPiIJrq3Y2wcGYu9MVqpbUS5LZUOp_wsjavg",
    "f4hUfkiaQoyRlt-QcP_fsN:APA91bG19yNk0OoOxAgZI2g7ZecbblsNSDLnnd0KS67tIaJ0IsrnEb7O_ZY7v54jRCz2-TbHxkyYKSmRR3FNQGXe0vkCAHocnbLOBeg20Hbkb8vqwAzP_qM",
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

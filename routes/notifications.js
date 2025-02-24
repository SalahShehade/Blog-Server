const express = require("express");
//const admin = require("firebase-admin");
const router = express.Router();
const admin = require("../firebase");

const Notification = require("../models/notifications.model");
// Function to fetch admin tokens from your database (replace this with your actual logic)
async function getAdminTokens() {
  // Example: Fetch tokens from your database
  return [
    "dTmPchbsS46wcUypTRXwei:APA91bEEvWBEJCB_vHl7a-RVBs7ol_92tO6xUAwqOxTdOZhjcKAUFrukos848r6iIJp1gPZFpNRXT2l7bmBcZU-Y9CsrYOqm20yeDeWQnYT2ZQcfx2Q4E1g",
    "dDzZsHTCRDqhpPePVbMjzu:APA91bE-dP10wgKl3o0-KMjB-h8LzO3RD8PPsOYaB4VvXypFy-Vyr4_-ZWgXK9EsaDbFCC4mKvCIF_G3-RgxQnxNmlgKErDoVdwDN1nyJnkixHTKcsVcq8s",
  ]; // Replace with actual token-fetching logic
}

// Initialize Firebase Admin
// const serviceAccount = require("../keys/hajziapp-firebase-adminsdk-oilsf-7b76365cd4.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

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

router.route("/send").post(async (req, res) => {
  const { title, body, recipient, type } = req.body;

  try {
    // Create and save the notification
    const notification = new Notification({
      title,
      body,
      recipient, // Using email instead of userId
      type,
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      data: notification,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create notification.",
      error,
    });
  }
});

// Route: Get all notifications for a user by email
// Route: Get all notifications for a user by email
router.route("/user/:email").get(async (req, res) => {
  const email = req.params.email; // Extract email from the route parameter

  try {
    const notifications = await Notification.find({ recipient: email }).sort({
      createdAt: -1,
    });
    res.status(200).json({ data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
      error,
    });
  }
});

// Route: Get unread notification count for a user by email
// Route: Get unread notification count for a user by email
router.route("/unreadCount/:email").get(async (req, res) => {
  const email = req.params.email; // Extract email from the route parameter

  try {
    const unreadCount = await Notification.countDocuments({
      recipient: email, // Use email instead of userId
      isRead: false,
    });
    res.status(200).json({ count: unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count.",
      error,
    });
  }
});

// Route: Mark a notification as read
router.route("/markAsRead/:notificationId").patch(async (req, res) => {
  const notificationId = req.params.notificationId;

  try {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found." });
    }

    notification.isRead = true;
    await notification.save();

    res
      .status(200)
      .json({ success: true, message: "Notification marked as read." });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification.",
      error,
    });
  }
});

// Route: Delete a notification by ID
router.route("/delete/:id").delete(async (req, res) => {
  const notificationId = req.params.id;

  try {
    const response = await Notification.findByIdAndDelete(notificationId);
    if (!response) {
      return res.status(404).json({
        Status: false,
        message: "Notification not found.",
      });
    }

    res.status(200).json({
      Status: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      Status: false,
      message: "Failed to delete notification.",
      error,
    });
  }
});

module.exports = router;

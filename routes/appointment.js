const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment.model");

// Get all appointments for a specific blog

// Delete all appointment slots for a specific blogId
router.delete("/deleteAll/:blogId", async (req, res) => {
  const blogId = req.params.blogId;

  try {
    const result = await Appointment.deleteMany({ blogId });

    if (result.deletedCount > 0) {
      res.status(200).json({
        message: "All time slots deleted successfully!",
        deletedCount: result.deletedCount,
      });
    } else {
      res.status(404).json({
        message: "No time slots found for the given blogId.",
      });
    }
  } catch (error) {
    console.error("Error deleting all slots:", error);
    res.status(500).json({
      message: "Failed to delete all time slots.",
      error: error.message,
    });
  }
});

router.delete("/delete/:blogId/:time", async (req, res) => {
  const { blogId, time } = req.params;

  try {
    const result = await Appointment.findOneAndDelete({
      blogId: blogId,
      time: time,
    });

    if (!result) {
      return res.status(404).json({ message: "Time slot not found." });
    }

    res.status(200).json({ message: "Time slot deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete the time slot.", error });
  }
});

// Update userName (email) for a specific appointment slot
router.patch("/updateUser/:blogId/:time", async (req, res) => {
  const { blogId, time } = req.params;
  const { newUserName } = req.body;

  // Basic email validation (allowing "Available Slot" as a valid userName)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (newUserName !== "Available Slot" && !emailRegex.test(newUserName)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  try {
    // Find the appointment slot
    const appointment = await Appointment.findOne({ blogId, time });

    if (!appointment) {
      return res.status(404).json({ message: "Time slot not found." });
    }

    // If updating to a real email, mark as booked
    if (newUserName !== "Available Slot") {
      appointment.userName = newUserName;
      appointment.status = "booked";
      appointment.isConfirmed = true; // Assuming you want to confirm bookings
    } else {
      // If setting back to "Available Slot", mark as available
      appointment.userName = "Available Slot";
      appointment.status = "available";
      appointment.isConfirmed = false;
    }

    await appointment.save();

    res.status(200).json({
      message: "User email updated successfully!",
      data: appointment,
    });
  } catch (error) {
    console.error("Error updating user email:", error);
    res.status(500).json({ message: "Failed to update user email.", error });
  }
});
router.post("/book", async (req, res) => {
  try {
    const { time, blogId, userName, duration, date } = req.body;

    if (!time || !blogId || !userName || !date) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Format the time correctly to match the DB format
    const formattedTime = time.slice(0, 5); // Take only HH:mm

    const appointment = await Appointment.findOneAndUpdate(
      { blogId, time: formattedTime, date, status: "available" },
      {
        $set: {
          userName: userName,
          status: "booked",
          isConfirmed: true,
          duration: duration || 30,
        },
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Time slot not available." });
    }

    res
      .status(200)
      .json({ message: "Slot successfully booked!", data: appointment });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ message: "Failed to book the slot.", error });
  }
});

// Add a new available time slot
router.post("/addAvailableTime", async (req, res) => {
  const { blogId, time } = req.body;

  try {
    const newSlot = new Appointment({
      blogId: blogId,
      userName: "Available Slot",
      time: time,
      date: date, // YYYY-MM-DD
      duration: 30,
    });

    await newSlot.save();
    res
      .status(200)
      .json({ message: "Available time added successfully.", data: newSlot });
  } catch (error) {
    res.status(500).json({ message: "Failed to add available time.", error });
  }
});

// Get all appointments for a specific blogId
router.get("/getAppointments/:blogId", async (req, res) => {
  try {
    const appointments = await Appointment.find({ blogId: req.params.blogId });
    const formattedAppointments = appointments.map((appointment) => ({
      userName: appointment.userName || "Available Slot",
      time: appointment.time,
      date: appointment.date,
      duration: appointment.duration || 30, // Default duration
      status: appointment.status || "available", // If status not set, mark it as available
    }));
    res.status(200).json({ data: formattedAppointments });
  } catch (error) {
    res.status(500).json({ message: "Failed to get appointments.", error });
  }
});

// Add new available time slot
router.post("/addAvailableTime", async (req, res) => {
  try {
    const { time, blogId, date } = req.body;

    if (!blogId || !time || !date) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const newAppointment = new Appointment({
      time,
      blogId,
      userName: "Available Slot",
      date, // This must be a valid non-null string, e.g. "2025-01-01"
      duration: 30, // Default duration for available slots
      status: "available",
    });

    await newAppointment.save();
    res.status(200).json({
      message: "Available time added successfully!",
      data: newAppointment,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to add available time.", error });
  }
});

// Mark an appointment as available (revert from "booked" to "available")
router.patch("/markAvailable/:blogId", async (req, res) => {
  try {
    const { time } = req.body;
    const updatedAppointment = await Appointment.findOneAndUpdate(
      { blogId: req.params.blogId, time },
      { $set: { status: "available", userName: "Available Slot" } }, // Revert to available
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Time slot not found." });
    }

    res.status(200).json({
      message: "Time slot marked as available!",
      data: updatedAppointment,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to mark time as available.", error });
  }
});

module.exports = router;

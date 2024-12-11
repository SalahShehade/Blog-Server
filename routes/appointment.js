const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment.model");

// Get all appointments for a specific blog

// Add a new available time slot
router.post("/addAvailableTime", async (req, res) => {
  const { blogId, time } = req.body;

  try {
    const newSlot = new Appointment({
      blogId: blogId,
      userName: "Available Slot",
      time: time,
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
    const { time, blogId } = req.body;

    const newAppointment = new Appointment({
      time,
      blogId,
      userName: "Available Slot",
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

router.post("/book", async (req, res) => {
  try {
    const { time, blogId, userName, duration } = req.body;

    if (!time || !blogId || !userName) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Format the time correctly to match the DB format
    const formattedTime = time.length === 5 ? time + ":00" : time; // Make sure the time has seconds, e.g., "09:30:00"

    const appointment = await Appointment.findOneAndUpdate(
      { blogId, time: formattedTime, status: "available" },
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

module.exports = router;

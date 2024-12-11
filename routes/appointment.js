const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment.model");

// Get all appointments for a specific blog
router.get("/getAppointments/:blogId", async (req, res) => {
  try {
    const appointments = await Appointment.find({ blogId: req.params.blogId });
    res.status(200).json({ data: appointments });
  } catch (error) {
    res.status(500).json({ message: "Failed to get appointments.", error });
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

// Mark a time slot as available
router.patch("/markAvailable/:blogId", async (req, res) => {
  const { time } = req.body;

  try {
    const appointment = await Appointment.findOneAndDelete({
      blogId: req.params.blogId,
      time: time,
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    res
      .status(200)
      .json({ message: "Time slot marked as available.", data: appointment });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to mark time as available.", error });
  }
});

module.exports = router;

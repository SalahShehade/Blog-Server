const express = require("express");
const AddBlogApproval = require("../models/AddBlogApproval.model");
const blogpostModel = require("../models/blogpost.model");

const router = express.Router();

// In your addApproval route (AddBlogApproval routes)
router.post("/addApproval", async (req, res) => {
  try {
    const { title, body, email, username, type, lat, lng } = req.body;

    if (!title || !body || !email || !type) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingBlog = await AddBlogApproval.findOne({
      title,
      body,
      email,
      username,
      type,
    });
    if (existingBlog) {
      return res.status(409).json({
        error: "A blog with the same title, body, and email already exists.",
      });
    }

    const newBlog = new AddBlogApproval({
      title,
      body,
      email,
      username,
      type,
      lat,
      lng,
    });
    const savedBlog = await newBlog.save();

    res
      .status(201)
      .json({ message: "Blog submitted for approval", data: savedBlog._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Assuming you're using Node.js with Express
router.get("/requests", async (req, res) => {
  try {
    const requests = await AddBlogApproval.find({
      status: { $in: ["pending"] },
    });
    res.status(200).json({ data: requests });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch requests" });
  }
});

// Example using Express.js
router.get("/images/:blogId", async (req, res) => {
  const { blogId } = req.params;
  try {
    const blogApproval = await blogpostModel.findById(blogId);
    if (!blogApproval) {
      return res.status(404).json({ message: "Blog request not found" });
    }
    res.status(200).json({ images: blogApproval.imageUrls }); // Adjust field name accordingly
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get the status of a blog by ID
router.get("/status/:id", async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await AddBlogApproval.findById(blogId);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.status(200).json({ status: blog.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch a specific blog by ID
router.get("/:id", async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await AddBlogApproval.findById(blogId);

    if (!blog) {
      console.log(`Blog with ID ${blogId} not found`);
      return res.status(404).json({ error: "Blog not found" });
    }

    res.status(200).json({ data: blog });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ message: "Failed to fetch blog" });
  }
});

// // Update the status of a blog
// router.patch("/updateStatus/:id", async (req, res) => {
//   try {
//     const blogId = req.params.id;
//     const { status } = req.body;

//     if (!["approved", "rejected"].includes(status)) {
//       return res.status(400).json({ error: "Invalid status value" });
//     }

//     const updatedBlog = await AddBlogApproval.findByIdAndUpdate(
//       blogId,
//       { status },
//       { new: true } // Return the updated document
//     );

//     if (!updatedBlog) {
//       return res.status(404).json({ error: "Blog not found" });
//     }

//     res
//       .status(200)
//       .json({ message: `Blog ${status} successfully`, updatedBlog });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

router.patch("/updateStatus/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedRequest = await AddBlogApproval.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    );
    res.status(200).json({
      data: updatedRequest,
      message: `Blog status updated to ${status}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update blog status" });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await AddBlogApproval.findByIdAndDelete(id);
    res.status(200).json({ message: "Blog request deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete blog request" });
  }
});

module.exports = router;

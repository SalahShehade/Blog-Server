const express = require("express");
const AddBlogApproval = require("../models/AddBlogApproval.model");

const router = express.Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  // The path to store the image and file name
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // `uploads` is the folder that stores the images
  },
  filename: (req, file, cb) => {
    // Use a unique filename by appending a timestamp
    const uniqueName = `${req.params.id}-${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 6, // 6 MB
  },
});
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

// Endpoint to upload preview image
router.patch("/previewImage/:id", upload.single("img"), async (req, res) => {
  try {
    const blog = await AddBlogApproval.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    blog.previewImage = req.file.path;
    await blog.save();

    return res
      .status(200)
      .json({ message: "Preview image updated successfully", data: blog });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint to upload cover images
router.patch("/coverImages/:id", upload.array("img", 5), async (req, res) => {
  try {
    const blog = await AddBlogApproval.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    const imagePaths = req.files.map((file) => file.path);
    blog.coverImages.push(...imagePaths);

    await blog.save();

    // Ensure only one response is sent
    return res
      .status(200)
      .json({ message: "Cover images uploaded successfully", data: blog });
  } catch (err) {
    console.error("Error uploading cover images:", err);
    return res.status(500).json({ error: "Internal server error" });
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

// Endpoint to fetch blog approval details by ID
router.get("/:blogId", async (req, res) => {
  const { blogId } = req.params;

  try {
    // Find the blog approval request by ID
    const blogApproval = await AddBlogApproval.findById(blogId);

    if (!blogApproval) {
      return res
        .status(404)
        .json({ message: "Blog approval request not found" });
    }

    // Return the blog approval details, including previewImage and coverImages
    res.status(200).json({
      data: {
        id: blogApproval._id,
        title: blogApproval.title,
        body: blogApproval.body,
        email: blogApproval.email,
        username: blogApproval.username,
        type: blogApproval.type,
        lat: blogApproval.lat,
        lng: blogApproval.lng,
        previewImage: blogApproval.previewImage || null,
        coverImages: blogApproval.coverImages || [],
        createdAt: blogApproval.createdAt,
        status: blogApproval.status || "pending",
      },
    });
  } catch (error) {
    console.error("Error fetching blog approval:", error);
    res.status(500).json({ message: "Internal server error" });
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

const express = require("express");
const router = express.Router();
const BlogPost = require("../models/blogpost.model");
const middleware = require("../middleware");
const multer = require("multer");
const AddBlogApproval = require("../models/AddBlogApproval.model"); // Adjust the path as needed
const path = require("path");
const admin = require("../firebase");

// Get reference to the storage bucket
const bucket = admin.storage().bucket("hajziapp.firebasestorage.app");

const storage = multer.memoryStorage(); // Switch to memory storage

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 6, // 6 MB
  },
});

const uploadFileToFirebase = async (file, destination) => {
  try {
    const fileUpload = bucket.file(destination);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      stream.on("error", (err) => {
        reject(new Error("Error uploading to Firebase: " + err.message));
      });

      stream.on("finish", async () => {
        try {
          await fileUpload.makePublic();
          console.log(`File ${destination} is now public.`);
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
          resolve(publicUrl);
        } catch (err) {
          console.error(`Failed to make file public: ${err}`);
          reject(new Error("Error making file public: " + err.message));
        }
      });

      stream.end(file.buffer);
    });
  } catch (error) {
    console.error("Error uploading image to Firebase:", error);
    throw error;
  }
};

// //first add code
router.route("/Add").post(middleware.checkToken, async (req, res) => {
  const blogpost = BlogPost({
    email: req.decoded.email,
    username: req.body.username,
    title: req.body.title,
    body: req.body.body,
    type: req.body.type,
    lat: req.body.lat,
    lng: req.body.lng,
  });

  blogpost
    .save()
    .then((result) => {
      res.json({ data: result["_id"] }); //updated from fetching the whole data to id only since we
      //only needed for adding image
    })
    .catch((error) => {
      console.log(error);
      res.json({ error: error });
    });
});

router.route("/update/:id").patch(middleware.checkToken, async (req, res) => {
  try {
    const blogpost = await BlogPost.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!blogpost) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res
      .status(200)
      .json({ message: "Blog updated successfully", data: blogpost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch(
  "/update/previewImage/:id",
  upload.single("img"), // Multer middleware for handling file uploads
  async (req, res) => {
    try {
      const blogPost = await BlogPost.findById(req.params.id);
      if (!blogPost) {
        return res.status(404).json({ error: "Blog not found" });
      }

      // Upload the image to Firebase
      const firebasePath = `previewImages/${req.params.id}-${Date.now()}-${
        req.file.originalname
      }`;
      const publicUrl = await uploadFileToFirebase(req.file, firebasePath);

      // Update the blog post with the Firebase Storage URL
      blogPost.previewImage = publicUrl;
      await blogPost.save();

      res
        .status(200)
        .json({ message: "Preview image updated successfully", publicUrl });
    } catch (err) {
      console.error("Error uploading preview image:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch("/rate/:id", middleware.checkToken, async (req, res) => {
  try {
    const { email } = req.decoded; // current user’s email from the JWT
    const { rating } = req.body; // rating sent from the client (1.0 to 5.0)

    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ Status: false, message: "Rating must be between 1 and 5" });
    }

    const blogPost = await BlogPost.findById(req.params.id);
    if (!blogPost) {
      return res.status(404).json({ Status: false, message: "Blog not found" });
    }

    // Check if the user already rated this blog
    if (blogPost.ratedBy.includes(email)) {
      return res.status(403).json({
        Status: false,
        message: "You have already rated this blog",
      });
    }

    // Update fields
    blogPost.ratingSum += rating;
    blogPost.numberOfRatings += 1;
    blogPost.ratedBy.push(email);

    await blogPost.save();

    // Return updated average and count
    const averageRating =
      blogPost.numberOfRatings === 0
        ? 0
        : blogPost.ratingSum / blogPost.numberOfRatings;

    return res.json({
      Status: true,
      message: "Blog rated successfully",
      data: {
        averageRating,
        numberOfRatings: blogPost.numberOfRatings,
      },
    });
  } catch (error) {
    console.error("Error rating blog:", error);
    return res
      .status(500)
      .json({ Status: false, message: "Internal server error" });
  }
});

router.get("/countUserShops", middleware.checkToken, async (req, res) => {
  try {
    // We get the user’s email from the decoded token.
    const { email } = req.decoded;
    // Count how many blogposts are associated with this user
    const shopCount = await BlogPost.countDocuments({ email });

    return res.status(200).json({ shopCount });
  } catch (error) {
    console.error("Error counting user shops:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get(
  "/getShopsByEmail/:email",
  middleware.checkToken,
  async (req, res) => {
    try {
      const { email } = req.params;
      // Find all blogposts/shops belonging to this user
      const shops = await BlogPost.find({ email: email });
      if (!shops) {
        return res.status(404).json({ msg: "No shops found for this user" });
      }
      res.status(200).json({ data: shops });
    } catch (error) {
      console.error("Error fetching shops by email:", error);
      res.status(500).json({
        msg: "Internal server error",
        error: error.message,
      });
    }
  }
);

/**
 * Get the rating info for a blog post
 * @route GET /blogpost/ratinginfo/:id
 */
router.get("/ratinginfo/:id", middleware.checkToken, async (req, res) => {
  try {
    const { email } = req.decoded;
    const blogPost = await BlogPost.findById(req.params.id);

    if (!blogPost) {
      return res.status(404).json({ Status: false, message: "Blog not found" });
    }

    const averageRating =
      blogPost.numberOfRatings === 0
        ? 0
        : blogPost.ratingSum / blogPost.numberOfRatings;

    // Check if current user has rated
    const userHasRated = blogPost.ratedBy.includes(email);

    return res.json({
      Status: true,
      averageRating,
      numberOfRatings: blogPost.numberOfRatings,
      userHasRated,
    });
  } catch (error) {
    console.error("Error fetching rating info:", error);
    return res
      .status(500)
      .json({ Status: false, message: "Internal server error" });
  }
});

router.delete("/remove/coverImage/:id", async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id);
    if (!blogPost) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Extract the file name from the URL
    const fileName = imageUrl.split("/").pop();
    const file = bucket.file(`coverImages/${fileName}`);

    // Delete the file from Firebase Storage
    await file.delete();

    // Remove the image URL from the database
    blogPost.coverImages = blogPost.coverImages.filter(
      (img) => img !== imageUrl
    );
    await blogPost.save();

    res.status(200).json({ message: "Cover image removed successfully" });
  } catch (err) {
    console.error("Error removing cover image:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// router.route("/Add").post(middleware.checkToken, async (req, res) => {
//   const { username } = req.decoded; // Get the username from the token
//   const { title, body, type } = req.body; // Extract title, body, and type

//   // Validate required fields
//   if (!title || !body || !type) {
//     return res
//       .status(400)
//       .json({ error: "Title, body, and type are required." });
//   }

//   // Create the blogpost object with the type field
//   const blogpost = new BlogPost({
//     username,
//     title,
//     body,
//     type, // Include the type field
//   });

//   // Save the blogpost
//   try {
//     const result = await blogpost.save();
//     res.status(201).json({ data: result["_id"] }); // Return the created blog ID
//   } catch (error) {
//     console.error("Error saving blog:", error);
//     res.status(500).json({ error: "Failed to save blog." });
//   }
// });

//------------------------------------------------------
//All these for Uploading Image part
//------------------------------------------------------
// const storage = multer.diskStorage({
//   //the path to store the image and file name
//   destination: (req, file, cb) => {
//     cb(null, "./uploads"); //uploads is the folder that stores the img
//   },
//   filename: (req, file, cb) => {
//     cb(null, req.params.id + ".jpg"); //use id to make it image name unique
//   },
// });

// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 1024 * 1024 * 6, //6 MB
//   },
// });

// router
//   .route("/add/coverImages/:id") //use the id parameter to name the image (a single user can upload multiple blogs so each blog image should have a unique ID)
//   .patch(middleware.checkToken, upload.single("img"), async (req, res) => {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     try {
//       const blogPost = await BlogPost.findOneAndUpdate(
//         { _id: req.params.id },
//         { $set: { coverImages: req.file.path } },
//         { new: true }
//       );

//       if (!blogPost) {
//         return res.status(404).json({ message: "CoverImage not found" });
//       }

//       res.status(200).json({
//         message: "The CoverImage added has been successfully updated",
//         data: blogPost,
//       });
//     } catch (err) {
//       res.status(500).send(err);
//     }
//   }); //we use multer for uploading profile image

// router
//   .route("/add/coverImages/:id")
//   .patch(middleware.checkToken, upload.array("img", 5), async (req, res) => {
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ error: "No files uploaded" });
//     }

//     try {
//       // Get the file paths of all uploaded images
//       const imagePaths = req.files.map((file) => file.path);

//       // Append the image paths to the `coverImages` array in the blog post
//       const blogPost = await BlogPost.findByIdAndUpdate(
//         req.params.id,
//         { $push: { coverImages: { $each: imagePaths } } },
//         { new: true } // Return the updated document
//       );

//       if (!blogPost) {
//         return res.status(404).json({ message: "Blog post not found" });
//       }

//       res.status(200).json({
//         message: "Cover images added successfully",
//         data: blogPost,
//       });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: err.message });
//     }
//   });
router.patch(
  "/add/coverImages/:id",
  upload.array("img", 5), // Multer middleware to handle multiple file uploads
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    try {
      const blogPost = await BlogPost.findById(req.params.id);
      if (!blogPost) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // Upload each file to Firebase and collect the URLs
      const imageUrls = await Promise.all(
        req.files.map(async (file) => {
          const firebasePath = `coverImages/${req.params.id}-${Date.now()}-${
            file.originalname
          }`;
          return await uploadFileToFirebase(file, firebasePath);
        })
      );

      // Add the new image URLs to the blog post
      blogPost.coverImages.push(...imageUrls);

      // Save the updated blog post
      await blogPost.save();

      res.status(200).json({
        message: "Cover images uploaded successfully",
        data: blogPost,
      });
    } catch (err) {
      console.error("Error uploading cover images:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

router.route("/getOwnBlog").get(middleware.checkToken, async (req, res) => {
  const response = await BlogPost.find({
    email: req.decoded.email,
  }); //find all blog data that belongs to the user

  if (!response) {
    return res.status(404).json({ message: "Blogs not found" });
  }
  return res.json({ data: response });
});

router.route("/getOtherBlog").get(middleware.checkToken, async (req, res) => {
  const response = await BlogPost.find({
    email: { $ne: req.decoded.email }, //if the username not equal (ne) to the token username then fetch the data
  }); //find all blog data that belongs to the other users

  if (!response) {
    return res.status(404).json({ message: "Blogs not found" });
  }
  return res.json({ data: response });
});

router.route("/getBlogs").get(middleware.checkToken, async (req, res) => {
  const { role } = req.decoded; // Assuming the role is stored in the decoded JWT

  // Check user role
  if (role === "admin" || role === "customer" || role === "user") {
    // Admins and customers can see all blogs
    const response = await BlogPost.find(); // Fetch all blog posts

    if (!response) {
      return res.status(404).json({ message: "Blogs not found" });
    }
    return res.json({ data: response });
  }
});

router.route("/getBarberBlogs").get(middleware.checkToken, async (req, res) => {
  const { role } = req.decoded;

  if (["admin", "customer", "user"].includes(role)) {
    const response = await BlogPost.find({ type: "barbershop" }); // Fetch barbershop blogs

    if (!response) {
      return res.status(404).json({ message: "Barbershop blogs not found" });
    }

    return res.json({ data: response });
  } else {
    return res.status(403).json({ message: "Access denied" });
  }
});

router
  .route("/getHospitalBlogs")
  .get(middleware.checkToken, async (req, res) => {
    const { role } = req.decoded;

    if (["admin", "customer", "user"].includes(role)) {
      const response = await BlogPost.find({ type: "hospital" }); // Fetch hospital blogs

      if (!response) {
        return res.status(404).json({ message: "Hospital blogs not found" });
      }

      return res.json({ data: response });
    } else {
      return res.status(403).json({ message: "Access denied" });
    }
  });

// router.route("/delete/:id").delete(middleware.checkToken, async (req, res) => {
//   const response = await BlogPost.findOneAndDelete({
//     $and: [
//       { username: req.decoded.username }, //if the username is the same as the blog username then u can delete(to fix where any user can delete blogs of other users)
//       { _id: req.params.id },
//     ],
//   });

//   if (!response) {
//     return res.status(404).json({
//       Status: false,
//       message: "You don't have permission to delete this blog",
//     });
//   } else {
//     return res.json({ Status: true, message: "Blog deleted" });
//   }
// });

router.route("/delete/:id").delete(middleware.checkToken, async (req, res) => {
  try {
    const { role, email } = req.decoded; // Extract role and username from token

    let query;

    if (role === "admin") {
      // Admin can delete any blog by ID
      query = { _id: req.params.id };
    } else {
      // Non-admins can only delete their own blogs
      query = { _id: req.params.id, email: email };
    }

    const response = await BlogPost.findOneAndDelete(query);

    if (!response) {
      return res.status(404).json({
        Status: false,
        message: "You don't have permission to delete this blog",
      });
    }

    return res.json({ Status: true, message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return res
      .status(500)
      .json({ Status: false, message: "Internal server error" });
  }
});

router
  .route("/updateLikes/:id")
  .patch(middleware.checkToken, async (req, res) => {
    //forgot password part...................................
    try {
      const result = await BlogPost.findOneAndUpdate(
        { _id: req.params.id },
        { $set: { like: req.body.like } },
        { new: true } // this option returns the updated document
      );

      if (!result) {
        return res.status(404).json({ msg: "Blog not found" });
      }

      const msg = {
        msg: "Like successfully updated!",
        username: req.params.username,
      };
      return res.json(msg);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  });

// New endpoint to check if the user has liked the blog post
router.route("/isLiked/:id").get(middleware.checkToken, async (req, res) => {
  try {
    // Find the blog post by ID
    const blogPost = await BlogPost.findById(req.params.id);

    if (!blogPost) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    // Check if the current user has liked the blog post
    const userHasLiked = blogPost.likedBy.includes(req.decoded.username);

    return res.json({ isLiked: userHasLiked });
  } catch (err) {
    console.error("Error checking like status:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router
  .route("/getBlogDetails/:id")
  .get(middleware.checkToken, async (req, res) => {
    try {
      const blogPost = await BlogPost.findById(req.params.id);

      if (!blogPost) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      res.status(200).json({
        blogTitle: blogPost.title,
        authorName: blogPost.email, // Return the username directly
        username: blogPost.username,
        lat: blogPost.lat,
        lng: blogPost.lng,
      });
    } catch (error) {
      console.error("Error fetching blog details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

// router
//   .route("/getBlogDetails/:id")
//   .get(middleware.checkToken, async (req, res) => {
//     try {
//       // Fetch the blog details from the AddBlogApproval model
//       const blogApproval = await AddBlogApproval.findById(req.params.id); // Use AddBlogApproval model here

//       if (!blogApproval) {
//         return res.status(404).json({ message: "Blog post not found" });
//       }

//       // Return blog details
//       res.status(200).json({
//         title: blogApproval.title, // Fetch the title
//         username: blogApproval.username, // Fetch the username
//       });
//     } catch (error) {
//       console.error("Error fetching blog details:", error);
//       res.status(500).json({ message: "Internal server error" });
//     }
//   });

// Check the status of a specific blog post
router.route("/status/:id").get(middleware.checkToken, async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id);
    if (!blogPost) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    res.status(200).json({ status: blogPost.status });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching status", error: err.message });
  }
});

// Route to approve or reject a blog post (Admin only)
router
  .route("/updateStatus/:id")
  .patch(middleware.checkToken, async (req, res) => {
    const { role } = req.decoded; // Check if user is admin
    if (role !== "admin") {
      return res
        .status(403)
        .json({ message: "Unauthorized. Only admins can update status." });
    }

    const { status } = req.body; // Expecting 'approved' or 'rejected'
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    try {
      const blogPost = await BlogPost.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true }
      );
      if (!blogPost) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res
        .status(200)
        .json({ message: `Blog status updated to ${status}`, data: blogPost });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error updating status", error: err.message });
    }
  });

router.route("/validate").post(middleware.checkToken, async (req, res) => {
  const { title, body } = req.body;

  // Define validation criteria
  const maxTitleLength = 100;
  const minBodyLength = 20;

  // Perform validation
  if (!title || title.length === 0) {
    return res
      .status(400)
      .json({ status: "rejected", message: "Title is required" });
  }
  if (title.length > maxTitleLength) {
    return res.status(400).json({
      status: "rejected",
      message: `Title cannot exceed ${maxTitleLength} characters`,
    });
  }
  if (!body || body.length === 0) {
    return res
      .status(400)
      .json({ status: "rejected", message: "Body is required" });
  }
  if (body.length < minBodyLength) {
    return res.status(400).json({
      status: "rejected",
      message: `Body must be at least ${minBodyLength} characters`,
    });
  }

  // If all checks pass, mark it as approved
  res.status(200).json({
    status: "approved",
    message: "Blog is valid and can be submitted",
  });
});

router.route("/requests").get(middleware.checkToken, async (req, res) => {
  const { role } = req.decoded; // Check if the user is an admin
  if (role !== "admin") {
    return res
      .status(403)
      .json({ message: "Unauthorized. Only admins can view requests." });
  }

  try {
    const pendingBlogs = await BlogPost.find({ status: "pending" });
    if (!pendingBlogs || pendingBlogs.length === 0) {
      return res
        .status(404)
        .json({ message: "No pending blog requests found" });
    }
    res.status(200).json({ data: pendingBlogs });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching pending blogs", error: err.message });
  }
});

// router.post("/approve/:id", async (req, res) => {
//   try {
//     const blogId = req.params.id;
//     const { status } = req.body; // "approved" or "rejected"

//     if (!["approved", "rejected"].includes(status)) {
//       return res.status(400).json({ error: "Invalid status." });
//     }

//     // Fetch the blog from AddBlogApproval
//     const blog = await AddBlogApproval.findById(blogId);
//     if (!blog) {
//       return res.status(404).json({ error: "Blog not found." });
//     }

//     if (status === "approved") {
//       // Move to blogpost schema
//       const approvedBlog = new BlogPost({
//         title: blog.title,
//         body: blog.body,
//         username: blog.username, // Use the username from AddBlogApproval
//         status: "published", // Mark it as published
//         createdAt: blog.createdAt,
//       });

//       await approvedBlog.save();
//     }

//     // Remove the blog from AddBlogApproval schema
//     await blog.remove();

//     res.status(200).json({ message: `Blog ${status} successfully.` });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal server error." });
//   }
// });

//////////////////////
//Approve or Reject a blog
router.post("/approve/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const blogApproval = await AddBlogApproval.findById(req.params.id);

    if (!blogApproval) {
      return res.status(404).json({ error: "Blog not found" });
    }

    if (status === "approved") {
      const blogPost = new BlogPost({
        title: blogApproval.title,
        body: blogApproval.body,
        email: blogApproval.email,
        username: blogApproval.username,
        type: blogApproval.type,
        lat: blogApproval.lat,
        lng: blogApproval.lng,
        status: "approved",
        previewImage: blogApproval.previewImage,
        coverImages: blogApproval.coverImages,
      });

      await blogPost.save();
    }

    await blogApproval.remove();
    res.status(200).json({ message: `Blog ${status} successfully.` });
  } catch (error) {
    res.status(500).json({ error: "Internal server error." });
  }
});

// router.post("/approve/:id", async (req, res) => {
//   try {
//     const blogId = req.params.id;
//     const { status } = req.body; // "approved" or "rejected"

//     if (!["approved", "rejected"].includes(status)) {
//       return res.status(400).json({ error: "Invalid status." });
//     }

//     const blog = await AddBlogApproval.findById(blogId);
//     if (!blog) {
//       return res.status(404).json({ error: "Blog not found." });
//     }

//     if (status === "approved") {
//       // Move to blogpost schema
//       const approvedBlog = new BlogPost({
//         title: blog.title,
//         body: blog.body,
//         email: blog.email,
//         lat: blog.lat, // Copy lat
//         lng: blog.lng, // Copy lng
//         status: "published",
//         createdAt: blog.createdAt,
//       });

//       await approvedBlog.save();
//     }

//     // Remove from addBlogApproval schema
//     await blog.remove();

//     res.status(200).json({ message: `Blog ${status} successfully.` });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal server error." });
//   }
// });

// Endpoint to search blogs by title
// router.get("/search", async (req, res) => {
//   const { query } = req.query; // Get search query from URL parameters

//   if (!query || query.trim() === "") {
//     return res.status(400).json({ message: "Search query cannot be empty" });
//   }

//   try {
//     const blogs = await BlogPost.find({
//       title: { $regex: query.trim(), $options: "i" }, // Case-insensitive regex search
//     }).limit(20); // Optional: Limit results for performance

//     res.json(blogs);
//   } catch (error) {
//     console.error("Search Error:", error.message);
//     res
//       .status(500)
//       .json({ message: "An error occurred while searching for blogs" });
//   }
// });

router.get("/search", async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === "") {
    return res.status(400).json({ message: "Search query cannot be empty" });
  }

  try {
    const blogs = await BlogPost.find({
      title: { $regex: query.trim(), $options: "i" },
    }).limit(20);

    res.json({ data: blogs });
  } catch (error) {
    console.error("Search Error:", error.message);
    res
      .status(500)
      .json({ message: "An error occurred while searching for blogs" });
  }
});

//for payment method
router.patch("/updateRole", middleware.checkToken, async (req, res) => {
  try {
    const userId = req.decoded.id; // Extract user ID from token
    const { role } = req.body;

    if (role !== "customer") {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Role updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;

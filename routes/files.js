// routes/files.js - Fixed upload configuration

const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { PrismaClient } = require("@prisma/client");
const { ensureAuthenticated } = require("../middleware/auth");
const cloudinary = require("../config/cloudinary");

const router = express.Router();
const prisma = new PrismaClient();

// Fixed Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // Determine resource type based on file type
    let resourceType = "auto";
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.includes("document") ||
      file.mimetype === "text/plain" ||
      file.mimetype.includes("zip") ||
      file.mimetype.includes("word") ||
      file.mimetype.includes("excel") ||
      file.mimetype.includes("powerpoint")
    ) {
      resourceType = "raw";
    }

    // Generate unique public_id
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const publicId = `${timestamp}_${randomSuffix}_${file.originalname}`;

    return {
      folder: "file-uploader-test",
      resource_type: resourceType,
      public_id: publicId, // Fixed: return the actual string, not a function
      allowed_formats: [
        "jpg", "jpeg", "png", "gif", "webp",
        "pdf", "doc", "docx", "txt", "rtf",
        "mp4", "avi", "mov", "mp3", "wav"
      ],
    };
  },
});

// Multer setup with improved error handling
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("File filter - received file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
    });

    const allowedTypes = [
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "video/mp4", "video/avi", "video/quicktime",
      "audio/mp3", "audio/mpeg", "audio/wav",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      console.log("File type allowed:", file.mimetype);
      cb(null, true);
    } else {
      console.log("File type rejected:", file.mimetype);
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  },
});

// Upload form
router.get("/upload", ensureAuthenticated, async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.user.id },
      orderBy: { name: "asc" },
    });

    const selectedFolderId = req.query.folderId || null;

    res.render("upload", {
      title: "Upload File",
      folders,
      selectedFolderId,
    });
  } catch (error) {
    console.error("Error loading upload page:", error);
    req.flash("error_msg", "Error loading upload page");
    res.redirect("/dashboard");
  }
});

// Enhanced upload handler with proper resource type tracking
router.post("/upload", ensureAuthenticated, (req, res) => {
  console.log("\n=== UPLOAD DEBUG START ===");
  console.log("User ID:", req.user.id);
  console.log("Body:", req.body);

  upload.single("file")(req, res, async (err) => {
    console.log("\n--- Multer callback ---");

    if (err) {
      console.error("Multer error:", err);
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          req.flash("error_msg", "File too large. Maximum size is 10MB.");
        } else {
          req.flash("error_msg", `Upload error: ${err.message}`);
        }
      } else {
        req.flash("error_msg", err.message || "Error uploading file");
      }
      return res.redirect("/files/upload");
    }

    if (!req.file) {
      console.log("No file received");
      req.flash("error_msg", "Please select a file");
      return res.redirect("/files/upload");
    }

    // Log ALL properties of the file object to debug
    console.log("Complete file object:", JSON.stringify(req.file, null, 2));
    console.log("File object keys:", Object.keys(req.file));

    try {
      const { folderId } = req.body;

      // Validate folder ownership if folderId is provided
      if (folderId && folderId.trim() !== "") {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId: req.user.id },
        });

        if (!folder) {
          req.flash("error_msg", "Invalid folder selected");
          return res.redirect("/files/upload");
        }
      }

      // Extract file information with multiple fallback options
      const publicId = req.file.public_id || req.file.filename || req.file.key || `${Date.now()}_${req.file.originalname}`;
      const secureUrl = req.file.secure_url || req.file.url || req.file.path || req.file.location;
      const resourceType = req.file.resource_type || (
        req.file.mimetype === "application/pdf" ||
        req.file.mimetype.includes("document") ||
        req.file.mimetype === "text/plain" ||
        req.file.mimetype.includes("zip") ||
        req.file.mimetype.includes("word") ||
        req.file.mimetype.includes("excel") ||
        req.file.mimetype.includes("powerpoint")
      ) ? "raw" : "auto";

      console.log("Extracted values:", {
        publicId,
        secureUrl,
        resourceType
      });

      // Validate required fields
      if (!publicId) {
        console.error("Could not determine public_id");
        req.flash("error_msg", "Upload failed: Could not determine file ID");
        return res.redirect("/files/upload");
      }

      if (!secureUrl) {
        console.error("Could not determine URL");
        req.flash("error_msg", "Upload failed: Could not determine file URL");
        return res.redirect("/files/upload");
      }

      // Store file information with resource type
      const fileData = {
        originalName: req.file.originalname,
        filename: publicId, // Use extracted publicId as filename
        mimetype: req.file.mimetype,
        size: req.file.size,
        cloudinaryUrl: secureUrl,
        cloudinaryPublicId: publicId,
        cloudinaryResourceType: resourceType,
        userId: req.user.id,
        folderId: folderId && folderId.trim() !== "" ? folderId : null,
      };

      console.log("Saving file data:", fileData);

      await prisma.file.create({
        data: fileData,
      });

      console.log("✓ File saved to database successfully");
      req.flash("success_msg", "File uploaded successfully to cloud storage");

      if (folderId && folderId.trim() !== "") {
        res.redirect(`/folders/${folderId}`);
      } else {
        res.redirect("/dashboard");
      }
    } catch (error) {
      console.error("Database save error:", error);
      req.flash("error_msg", "Error saving file information");
      res.redirect("/files/upload");
    }
  });
});

// Fixed download functionality
router.get("/:id/download", ensureAuthenticated, async (req, res) => {
  try {
    console.log("\n=== DOWNLOAD DEBUG START ===");
    console.log("File ID:", req.params.id);

    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!file) {
      console.log("File not found in database");
      req.flash("error_msg", "File not found");
      return res.redirect("/dashboard");
    }

    console.log("Found file:", {
      originalName: file.originalName,
      cloudinaryPublicId: file.cloudinaryPublicId,
      cloudinaryUrl: file.cloudinaryUrl,
      mimetype: file.mimetype,
      resourceType: file.cloudinaryResourceType
    });

    // Since your working URL uses 'image/upload', let's try that first for PDFs
    let resourceType = "image"; // Start with image since that's what works
    
    // If the file was actually uploaded as raw, we might need to adjust
    if (file.cloudinaryResourceType === "raw") {
      resourceType = "raw";
    }

    console.log("Using resource type:", resourceType);

    try {
      // Method 1: Try to modify the working URL to add download flag
      if (file.cloudinaryUrl) {
        let downloadUrl = file.cloudinaryUrl;
        
        // Add the attachment flag to force download
        if (downloadUrl.includes("/upload/")) {
          downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
        }
        
        console.log("Method 1 - Modified URL:", downloadUrl);
        
        // Set proper headers
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${file.originalName}"`
        );
        
        return res.redirect(downloadUrl);
      }

    } catch (urlError) {
      console.error("Method 1 failed:", urlError);
    }

    // Method 2: Try different resource types with cloudinary.url()
    const resourceTypesToTry = ["image", "raw", "auto", "video"];
    
    for (const resType of resourceTypesToTry) {
      try {
        const testUrl = cloudinary.url(file.cloudinaryPublicId, {
          resource_type: resType,
          secure: true,
          flags: "attachment"
        });
        
        console.log(`Method 2 - Trying resource type ${resType}:`, testUrl);
        
        // Set proper headers
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${file.originalName}"`
        );
        
        return res.redirect(testUrl);
        
      } catch (fallbackError) {
        console.log(`Resource type ${resType} failed:`, fallbackError.message);
        continue;
      }
    }

    // Method 3: Direct cloudinary URL without modifications
    if (file.cloudinaryUrl) {
      console.log("Method 3 - Using direct URL:", file.cloudinaryUrl);
      
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.originalName}"`
      );
      
      return res.redirect(file.cloudinaryUrl);
    }

    throw new Error("All download methods failed");

  } catch (error) {
    console.error("Download error:", error);
    req.flash("error_msg", "Error downloading file. Please try again.");
    res.redirect("/dashboard");
  }
});

// File details
router.get("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { folder: true },
    });

    if (!file) {
      req.flash("error_msg", "File not found");
      return res.redirect("/dashboard");
    }

    res.render("file-details", { title: `File: ${file.originalName}`, file });
  } catch (error) {
    console.error("Error loading file details:", error);
    req.flash("error_msg", "Error loading file");
    res.redirect("/dashboard");
  }
});

// Delete file
router.delete("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!file) {
      req.flash("error_msg", "File not found");
      return res.redirect("/dashboard");
    }

    // Delete from Cloudinary with correct resource type
    try {
      const resourceType = file.cloudinaryResourceType || "auto";
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
        resource_type: resourceType,
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
      // Continue with database deletion
    }

    // Delete from database
    await prisma.file.delete({ where: { id: req.params.id } });

    req.flash("success_msg", "File deleted successfully");
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error deleting file:", error);
    req.flash("error_msg", "Error deleting file");
    res.redirect("/dashboard");
  }
});

module.exports = router;
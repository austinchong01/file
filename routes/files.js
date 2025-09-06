const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { PrismaClient } = require("@prisma/client");
const { ensureAuthenticated } = require("../middleware/auth");
const cloudinary = require("../config/cloudinary");

const router = express.Router();
const prisma = new PrismaClient();

// Test Cloudinary connection on startup
console.log("Testing Cloudinary configuration...");
console.log("Cloud name:", cloudinary.config().cloud_name);
console.log("API key:", cloudinary.config().api_key ? "Set" : "Missing");
console.log("API secret:", cloudinary.config().api_secret ? "Set" : "Missing");

// Simplified Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "file-uploader-test", // Simple folder name for testing
    resource_type: "auto",
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e9);
      return `${timestamp}_${randomSuffix}_${file.originalname}`;
    },
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "pdf",
      "doc",
      "docx",
      "txt",
      "mp4",
      "mp3",
    ],
  },
});

// Multer setup with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("File filter - received file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "video/mp4",
      "video/avi",
      "video/quicktime",
      "audio/mp3",
      "audio/mpeg",
      "audio/wav",
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

// Handle upload with extensive debugging
router.post("/upload", ensureAuthenticated, (req, res) => {
  console.log("\n=== UPLOAD DEBUG START ===");
  console.log("User ID:", req.user.id);
  console.log("Body:", req.body);

  upload.single("file")(req, res, async (err) => {
    console.log("\n--- Multer callback ---");

    if (err) {
      console.error("Multer error:", err);
      if (err instanceof multer.MulterError) {
        console.log("Multer error type:", err.code);
        if (err.code === "LIMIT_FILE_SIZE") {
          req.flash("error_msg", "File too large. Maximum size is 10MB.");
        } else {
          req.flash("error_msg", `Upload error: ${err.message}`);
        }
      } else {
        console.log("Custom error:", err.message);
        req.flash("error_msg", err.message || "Error uploading file");
      }
      return res.redirect("/files/upload");
    }

    console.log("\n--- File object analysis ---");
    if (!req.file) {
      console.log("No file received");
      req.flash("error_msg", "Please select a file");
      return res.redirect("/files/upload");
    }

    // Log ALL properties of the file object
    console.log("File object keys:", Object.keys(req.file));
    console.log("Complete file object:", JSON.stringify(req.file, null, 2));

    try {
      const { folderId } = req.body;

      // Validate folder ownership if folderId is provided
      if (folderId && folderId.trim() !== "") {
        console.log("Validating folder:", folderId);
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId: req.user.id },
        });

        if (!folder) {
          console.log("Invalid folder selected");
          req.flash("error_msg", "Invalid folder selected");
          return res.redirect("/files/upload");
        }
        console.log("Folder validated:", folder.name);
      }

      // Extract file information with extensive fallbacks
      console.log("\n--- Extracting file data ---");

      // Try different property names that Cloudinary might use
      const possibleFilenames = [
        req.file.public_id,
        req.file.filename,
        req.file.originalname,
        `${Date.now()}_${req.file.originalname}`,
      ];

      const possibleUrls = [
        req.file.secure_url,
        req.file.url,
        req.file.path,
        req.file.location,
      ];

      const possiblePublicIds = [
        req.file.public_id,
        req.file.filename,
        req.file.key,
      ];

      const filename =
        possibleFilenames.find((f) => f) ||
        `fallback_${Date.now()}_${req.file.originalname}`;
      const cloudinaryUrl = possibleUrls.find((u) => u) || "";
      const cloudinaryPublicId = possiblePublicIds.find((p) => p) || filename;

      console.log("Extracted data:");
      console.log("- filename:", filename);
      console.log("- cloudinaryUrl:", cloudinaryUrl);
      console.log("- cloudinaryPublicId:", cloudinaryPublicId);

      // Validate that we have the required data
      if (!filename) {
        console.error("Could not determine filename");
        req.flash("error_msg", "Upload failed: Could not determine filename");
        return res.redirect("/files/upload");
      }

      if (!cloudinaryUrl) {
        console.error("Could not determine Cloudinary URL");
        req.flash(
          "error_msg",
          "Upload failed: Could not get file URL from Cloudinary"
        );
        return res.redirect("/files/upload");
      }

      // Prepare file data for database
      const fileData = {
        originalName: req.file.originalname,
        filename: filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        cloudinaryUrl: cloudinaryUrl,
        cloudinaryPublicId: cloudinaryPublicId,
        userId: req.user.id,
        folderId: folderId && folderId.trim() !== "" ? folderId : null,
      };

      console.log("\n--- Database save attempt ---");
      console.log("File data to save:", JSON.stringify(fileData, null, 2));

      // Validate all required fields are present
      const requiredFields = [
        "originalName",
        "filename",
        "mimetype",
        "size",
        "cloudinaryUrl",
        "cloudinaryPublicId",
        "userId",
      ];
      const missingFields = requiredFields.filter((field) => !fileData[field]);

      if (missingFields.length > 0) {
        console.error("Missing required fields:", missingFields);
        req.flash(
          "error_msg",
          `Upload failed: Missing required data: ${missingFields.join(", ")}`
        );
        return res.redirect("/files/upload");
      }

      await prisma.file.create({
        data: fileData,
      });

      console.log("✓ File saved to database successfully");
      console.log("=== UPLOAD DEBUG END ===\n");

      req.flash("success_msg", "File uploaded successfully to cloud storage");

      // Redirect to appropriate location
      if (folderId && folderId.trim() !== "") {
        res.redirect(`/folders/${folderId}`);
      } else {
        res.redirect("/dashboard");
      }
    } catch (error) {
      console.error("\n--- Database save error ---");
      console.error("Error details:", error);
      console.log("=== UPLOAD DEBUG END ===\n");

      req.flash("error_msg", "Error saving file information");
      res.redirect("/files/upload");
    }
  });
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

// Enhanced download file functionality with corrected Public ID handling
router.get("/:id/download", ensureAuthenticated, async (req, res) => {
  try {
    console.log("\n=== DOWNLOAD DEBUG START ===");
    console.log("File ID:", req.params.id);
    console.log("User ID:", req.user.id);

    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { folder: true },
    });

    if (!file) {
      console.log("File not found in database");
      req.flash("error_msg", "File not found");
      return res.redirect("/dashboard");
    }

    console.log("Found file:", {
      id: file.id,
      originalName: file.originalName,
      cloudinaryPublicId: file.cloudinaryPublicId,
      cloudinaryUrl: file.cloudinaryUrl,
      mimetype: file.mimetype,
    });

    // Check if we have valid Cloudinary data
    if (!file.cloudinaryPublicId && !file.cloudinaryUrl) {
      console.error("No Cloudinary data available for file");
      req.flash(
        "error_msg",
        "File download not available - no cloud storage data"
      );
      return res.redirect("/dashboard");
    }

    // Determine the correct resource type based on file type
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
    } else if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    } else if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    } else if (file.mimetype.startsWith("audio/")) {
      resourceType = "video"; // Cloudinary treats audio as video resource
    }

    console.log("Using resource type:", resourceType);
    console.log("Public ID from database:", file.cloudinaryPublicId);

    // Method 1: Use the exact public_id from database
    try {
      if (file.cloudinaryPublicId) {
        const downloadUrl = cloudinary.url(file.cloudinaryPublicId, {
          resource_type: resourceType,
          secure: true,
          flags: "attachment",
        });

        console.log("Generated download URL:", downloadUrl);
        console.log("=== DOWNLOAD DEBUG END ===\n");

        // Set headers and redirect
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${file.originalName}"`
        );
        return res.redirect(downloadUrl);
      }
    } catch (urlError) {
      console.error("Error generating Cloudinary URL:", urlError);
    }

    // Method 2: Try with different resource types if first fails
    const resourceTypesToTry = ["raw", "auto", "image", "video"];

    for (const resType of resourceTypesToTry) {
      try {
        const downloadUrl = cloudinary.url(file.cloudinaryPublicId, {
          resource_type: resType,
          secure: true,
          flags: "attachment",
        });

        console.log(`Trying resource type ${resType}:`, downloadUrl);

        // Test if this URL might work by checking the format
        if (
          downloadUrl &&
          downloadUrl.includes(file.cloudinaryPublicId.replace(/\//g, "/"))
        ) {
          console.log(`Using resource type: ${resType}`);
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.originalName}"`
          );
          return res.redirect(downloadUrl);
        }
      } catch (err) {
        console.log(`Resource type ${resType} failed:`, err.message);
        continue;
      }
    }

    // Method 3: Manual URL construction as fallback
    if (file.cloudinaryUrl) {
      try {
        let downloadUrl = file.cloudinaryUrl;

        // Add download flag
        if (downloadUrl.includes("/upload/")) {
          downloadUrl = downloadUrl.replace(
            "/upload/",
            "/upload/fl_attachment/"
          );
        } else {
          downloadUrl += downloadUrl.includes("?")
            ? "&fl_attachment=true"
            : "?fl_attachment=true";
        }

        console.log("Manual URL construction:", downloadUrl);
        console.log("=== DOWNLOAD DEBUG END ===\n");

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${file.originalName}"`
        );
        return res.redirect(downloadUrl);
      } catch (modifyError) {
        console.error("Error modifying URL:", modifyError);
      }
    }

    // Method 4: Fallback to proxy download
    console.log(
      "All URL generation methods failed, falling back to proxy download"
    );
    return res.redirect(`/files/${file.id}/download-proxy`);
  } catch (error) {
    console.error("Download error:", error);
    console.log("=== DOWNLOAD DEBUG END ===\n");
    req.flash("error_msg", "Error downloading file");
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

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
        resource_type: "auto",
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

const express = require("express");
const multer = require("multer");
const path = require("path");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { PrismaClient } = require("@prisma/client");
const { authenticateJWT } = require("../middleware/jwtAuth"); // Updated import
const cloudinary = require("../config/cloudinary");

const router = express.Router();
const prisma = new PrismaClient();

const getResourceType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "raw";
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const resourceType = getResourceType(file.mimetype);
    return {
      folder: "file-uploader-test",
      resource_type: resourceType,
      public_id: `${Date.now()}_${Math.round(Math.random() * 1e9)}_${
        file.originalname
      }`,
      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "pdf",
        "mp4",
        "mov",
      ],
    };
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    console.log("FileFilter - File mimetype:", file.mimetype);

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "video/mp4",
      "video/quicktime",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      console.log("File type accepted:", file.mimetype);
      cb(null, true);
    } else {
      console.log("File type rejected:", file.mimetype);
      cb(new Error(`File type ${file.mimetype} not supported`), false);
    }
  },
});

// Updated to use JWT authentication
router.post("/upload", authenticateJWT, (req, res) => {
  console.log("Upload request received");

  upload.single("file")(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Maximum size is 10MB."
          : err.message || "Error uploading file";
      return res.status(400).json({ success: false, message });
    }

    if (!req.file) {
      console.error("No file received");
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    try {
      const { folderId, displayName } = req.body;

      // Validate folder ownership if folderId is provided
      if (folderId && folderId.trim()) {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId: req.user.id },
        });
        if (!folder) {
          return res.status(400).json({
            success: false,
            message: "Invalid folder selected",
          });
        }
      }

      // Use displayName if provided, otherwise fall back to original name
      const finalDisplayName =
        displayName && displayName.trim()
          ? displayName.trim()
          : req.file.originalname;

      // Instead of just req.file.public_id, store the full path
      const publicId = req.file.filename;

      const secureUrl =
        req.file.secure_url ||
        req.file.url ||
        req.file.path ||
        req.file.location;
      const resourceType = getResourceType(req.file.mimetype);

      const fileRecord = await prisma.file.create({
        data: {
          originalName: req.file.originalname,
          displayName: finalDisplayName,
          mimetype: req.file.mimetype,
          size: req.file.size,
          cloudinaryUrl: secureUrl,
          cloudinaryPublicId: publicId,
          cloudinaryResourceType: resourceType,
          userId: req.user.id, // Using req.user from JWT middleware
          folderId: folderId && folderId.trim() ? folderId : null,
        },
      });

      return res.json({
        success: true,
        message: "File uploaded successfully",
        file: fileRecord,
      });
    } catch (error) {
      console.error("Upload error:", error);

      return res.status(500).json({
        success: false,
        message: "Error uploading file: " + error.message,
      });
    }
  });
});

router.get("/:id/download", authenticateJWT, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id }, // Using req.user from JWT
    });

    if (!file) {
      console.log("File not found or user doesn't own it");
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    let downloadUrl = cloudinary.url(
      `${file.cloudinaryPublicId}`,
      {
        flags: "attachment",
        resource_type: file.cloudinaryResourceType,
      }
    );

    // Add file extension for non-raw files
    if (file.cloudinaryResourceType !== "raw") {
      downloadUrl += path.extname(file.originalName);
    }

    res.redirect(downloadUrl);
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ success: false, message: "Download failed" });
  }
});

router.post("/rename", authenticateJWT, async (req, res) => {
  try {
    const { fileId, displayName } = req.body;

    if (!fileId) {
      return res
        .status(400)
        .json({ success: false, message: "File ID is required" });
    }

    // Check if file exists and belongs to user
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId: req.user.id }, // Using req.user from JWT
      include: { folder: true },
    });

    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    // Update the file display name
    await prisma.file.update({
      where: { id: fileId },
      data: { displayName: displayName.trim() },
    });

    return res.json({
      success: true,
      message: "File renamed successfully",
    });
  } catch (error) {
    console.error("Rename file error:", error);

    return res.status(500).json({
      success: false,
      message: "Error renaming file",
    });
  }
});

router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id }, // Using req.user from JWT
      include: { folder: true },
    });

    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    let err = "";
    try {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
        resource_type: file.cloudinaryResourceType,
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
      // Continue with database deletion even if Cloudinary deletion fails
      err = " (Cloudinary deletion error)";
    }

    await prisma.file.delete({ where: { id: req.params.id } });

    return res.json({
      success: true,
      message: "File deleted successfully" + err,
    });
  } catch (error) {
    console.error("Delete File error:", error);

    return res.status(500).json({
      success: false,
      message: "Error deleting file",
    });
  }
});

module.exports = router;
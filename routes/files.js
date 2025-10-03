const express = require("express");
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const router = express.Router();

// configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({

});

// Configure Multer
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, // 5MB file size 
            files: 5 },                 // Max 5 files
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});


router.post("/upload", (req, res) => {
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
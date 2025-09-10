const express = require("express");
const multer = require("multer");
const path = require('path');
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { PrismaClient } = require("@prisma/client");
const { ensureAuthenticated } = require("../middleware/auth");
const cloudinary = require("../config/cloudinary");

const router = express.Router();
const prisma = new PrismaClient();

const getResourceType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  // if (
  //   mimetype.includes("pdf") ||
  //   mimetype.includes("document") ||
  //   mimetype.includes("text") ||
  //   mimetype.includes("word") ||
  //   mimetype.includes("excel") ||
  //   mimetype.includes("powerpoint") ||
  //   mimetype === "application/zip" ||
  //   mimetype === "application/x-zip-compressed"
  // )
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
        "avi",
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
      "video/avi",
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

router.post("/upload", ensureAuthenticated, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Maximum size is 10MB."
          : err.message || "Error uploading file";
      req.session.error_msg = message;
      return res.redirect("/dashboard");
    }

    try {
      const { folderId, displayName } = req.body;

      // Validate folder ownership if folderId is provided
      if (folderId && folderId.trim()) {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId: req.user.id },
        });
        if (!folder) {
          req.session.error_msg = "Invalid folder selected";
          return res.redirect("/files/upload");
        }
      }

      // Use displayName if provided, otherwise fall back to original name
      const finalDisplayName =
        displayName && displayName.trim()
          ? displayName.trim()
          : req.file.originalname;

      const publicId =
        req.file.public_id ||
        req.file.filename ||
        req.file.key ||
        `${Date.now()}_${req.file.originalname}`;
      const secureUrl =
        req.file.secure_url ||
        req.file.url ||
        req.file.path ||
        req.file.location;
      const resourceType = getResourceType(req.file.mimetype);

      await prisma.file.create({
        data: {
          originalName: req.file.originalname,
          displayName: finalDisplayName,
          filename: publicId,
          mimetype: req.file.mimetype,
          size: req.file.size,
          cloudinaryUrl: secureUrl,
          cloudinaryPublicId: publicId,
          cloudinaryResourceType: resourceType,
          userId: req.user.id,
          folderId: folderId && folderId.trim() ? folderId : null,
        },
      });

      // Redirect to folder or dashboard
      if (folderId && folderId.trim()) {
        res.redirect(`/folders/${folderId}`);
      } else {
        res.redirect("/dashboard");
      }
    } catch (error) {
      console.error("Upload file error:", error);
      req.session.error_msg = "Error uploading file";
      res.redirect("/files/upload");
    }
  });
});

router.get("/:id/download", ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!file) {
      req.session.error_msg = "File not found";
      return res.redirect("/dashboard");
    }

    // Generate a download URL with the original filename
    let downloadUrl = cloudinary.url(file.cloudinaryPublicId, {
      flags: "attachment",
      resource_type: file.cloudinaryResourceType,
    });

    if (file.cloudinaryResourceType != "raw") downloadUrl += path.extname(file.originalName);

    res.redirect(downloadUrl);
  } catch (error) {
    console.error("Download file error:", error);
    req.session.error_msg = "Error downloading file";
    res.redirect("/dashboard");
  }
});

router.delete("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { folder: true },
    });

    if (!file) {
      req.session.error_msg = "File not found";
      return res.redirect("/dashboard");
    }

    try {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
        resource_type: file.cloudinaryResourceType,
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    await prisma.file.delete({ where: { id: req.params.id } });

    // Redirect to folder or dashboard
    if (file.folderId) {
      res.redirect(`/folders/${file.folderId}`);
    } else {
      res.redirect("/dashboard");
    }
  } catch (error) {
    console.error("Delete file error:", error);
    req.session.error_msg = "Error deleting file";
    res.redirect("/dashboard");
  }
});

module.exports = router;

const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { PrismaClient } = require("@prisma/client");
const { ensureAuthenticated } = require("../middleware/auth");
const cloudinary = require("../config/cloudinary");

const router = express.Router();
const prisma = new PrismaClient();

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const resourceType = file.mimetype.includes("pdf") || 
                        file.mimetype.includes("document") || 
                        file.mimetype.includes("text") || 
                        file.mimetype.includes("zip") || 
                        file.mimetype.includes("word") || 
                        file.mimetype.includes("excel") || 
                        file.mimetype.includes("powerpoint") ? "raw" : "auto";

    return {
      folder: "file-uploader-test",
      resource_type: resourceType,
      public_id: `${Date.now()}_${Math.round(Math.random() * 1e9)}_${file.originalname}`,
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "txt", "rtf", "mp4", "avi", "mov", "mp3", "wav"],
    };
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain", "video/mp4", "video/avi", "video/quicktime",
      "audio/mp3", "audio/mpeg", "audio/wav",
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  },
});

router.get("/upload", ensureAuthenticated, async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.user.id },
      orderBy: { name: "asc" },
    });
    res.render("upload", { 
      title: "Upload File", 
      folders,
      selectedFolderId: req.query.folderId || null
    });
  } catch (error) {
    req.flash("error_msg", "Error loading upload page");
    res.redirect("/dashboard");
  }
});

router.post("/upload", ensureAuthenticated, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE" 
        ? "File too large. Maximum size is 10MB." 
        : err.message || "Error uploading file";
      req.flash("error_msg", message);
      return res.redirect("/files/upload");
    }

    if (!req.file) {
      req.flash("error_msg", "Please select a file");
      return res.redirect("/files/upload");
    }

    try {
      const { folderId } = req.body;

      if (folderId && folderId.trim()) {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId: req.user.id },
        });
        if (!folder) {
          req.flash("error_msg", "Invalid folder selected");
          return res.redirect("/files/upload");
        }
      }

      const publicId = req.file.public_id || req.file.filename || req.file.key || `${Date.now()}_${req.file.originalname}`;
      const secureUrl = req.file.secure_url || req.file.url || req.file.path || req.file.location;
      const resourceType = req.file.resource_type || (
        req.file.mimetype.includes("pdf") || 
        req.file.mimetype.includes("document") || 
        req.file.mimetype.includes("text") ? "raw" : "auto"
      );

      await prisma.file.create({
        data: {
          originalName: req.file.originalname,
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

      req.flash("success_msg", "File uploaded successfully");
      res.redirect(folderId && folderId.trim() ? `/folders/${folderId}` : "/dashboard");
    } catch (error) {
      req.flash("error_msg", "Error saving file information");
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
      req.flash("error_msg", "File not found");
      return res.redirect("/dashboard");
    }

    let downloadUrl = file.cloudinaryUrl;
    if (downloadUrl.includes("/upload/")) {
      downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
    }

    res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
    res.redirect(downloadUrl);
  } catch (error) {
    req.flash("error_msg", "Error downloading file");
    res.redirect("/dashboard");
  }
});

router.delete("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!file) {
      req.flash("error_msg", "File not found");
      return res.redirect("/dashboard");
    }

    try {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
        resource_type: file.cloudinaryResourceType || "auto",
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
    }

    await prisma.file.delete({ where: { id: req.params.id } });

    req.flash("success_msg", "File deleted successfully");
    res.redirect("/dashboard");
  } catch (error) {
    req.flash("error_msg", "Error deleting file");
    res.redirect("/dashboard");
  }
});

module.exports = router;
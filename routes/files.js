const express = require("express");
const router = express.Router();

const cloudinary = require("../config/cloudinary");
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
const upload = require("../middleware/multer");
const fileController = require("../controllers/file");

router.get("/upload", (req, res) => {
  res.render("test");
});

router.post("/test", (req, res) => {
  const userId = "user1";
  const folderId = "folder1"

  upload.single("image")(req, res, (err) => {
    // error check
    if (err) {
      console.log(err.message);
      return res.status(400).json({ error: err.message });
    }

    const base64File = `data:${
      req.file.mimetype
    };base64,${req.file.buffer.toString("base64")}`;

    // upload to cloudinary
    cloudinary.uploader.upload(
      base64File,
      {
        folder: "drive",
        resource_type: "auto",
      },
      async (error, result) => {
        if (error) {
          console.log(error.message);
          return res.status(500).json({
            success: false,
            message: "Cloudinary Upload Error",
          });
        }

        // upload to database with try-catch
        try {
          await fileController.createFile(req.file, folderId, result, userId, req.body.displayName);

          res.json({
            success: true,
            message: "File uploaded successfully",
            displayName: req.body.displayName
          });
        } catch (dbError) {
          console.error("Database error:", dbError.message);
          
          // Optionally: Clean up Cloudinary upload since DB save failed
          await cloudinary.uploader.destroy(result.public_id, { resource_type: result.resource_type});
          
          return res.status(500).json({
            success: false,
            result: result.resource_type,
            message: "Database save failed",
            error: dbError.message
          });
        }
      }
    );
  });
});

// router.post("/rename", authenticateJWT, async (req, res) => {
//   try {
//     const { fileId, displayName } = req.body;

//     if (!fileId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "File ID is required" });
//     }

//     // Check if file exists and belongs to user
//     const file = await prisma.file.findFirst({
//       where: { id: fileId, userId: req.user.id }, // Using req.user from JWT
//       include: { folder: true },
//     });

//     if (!file) {
//       return res
//         .status(404)
//         .json({ success: false, message: "File not found" });
//     }

//     // Update the file display name
//     await prisma.file.update({
//       where: { id: fileId },
//       data: { displayName: displayName.trim() },
//     });

//     return res.json({
//       success: true,
//       message: "File renamed successfully",
//     });
//   } catch (error) {
//     console.error("Rename file error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Error renaming file",
//     });
//   }
// });

// router.delete("/:id", authenticateJWT, async (req, res) => {
//   try {
//     const file = await prisma.file.findFirst({
//       where: { id: req.params.id, userId: req.user.id }, // Using req.user from JWT
//       include: { folder: true },
//     });

//     if (!file) {
//       return res
//         .status(404)
//         .json({ success: false, message: "File not found" });
//     }

//     let err = "";
//     try {
//       await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
//         resource_type: file.cloudinaryResourceType,
//       });
//     } catch (cloudinaryError) {
//       console.error("Cloudinary deletion error:", cloudinaryError);
//       // Continue with database deletion even if Cloudinary deletion fails
//       err = " (Cloudinary deletion error)";
//     }

//     await prisma.file.delete({ where: { id: req.params.id } });

//     return res.json({
//       success: true,
//       message: "File deleted successfully" + err,
//     });
//   } catch (error) {
//     console.error("Delete File error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Error deleting file",
//     });
//   }
// });

module.exports = router;

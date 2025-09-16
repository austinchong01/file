const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateJWT } = require("../middleware/jwtAuth"); // Updated import

const router = express.Router();
const prisma = new PrismaClient();

// Create folder - Updated to use JWT auth
router.post("/create", authenticateJWT, async (req, res) => {
  try {
    const { name, parentId } = req.body;

    await prisma.folder.create({
      data: {
        name,
        userId: req.user.id, // Using req.user from JWT middleware
        parentId: parentId || null,
      },
    });

    // Determine redirect URL based on parentId
    const redirectUrl = parentId ? `/folders/${parentId}` : "/dashboard";

    return res.json({
      success: true,
      message: "Folder created successfully",
      redirectUrl: redirectUrl,
    });
  } catch (error) {
    console.error(error);
    const { parentId } = req.body;
    const redirectUrl = parentId ? `/folders/${parentId}` : "/dashboard";

    return res.json({
      success: false,
      message: "Error creating folder",
      redirectUrl: redirectUrl,
    });
  }
});

// View folder contents - Updated to use JWT auth
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.user.id }, // Using req.user from JWT
      include: {
        children: { orderBy: { name: "asc" } },
        files: { orderBy: { createdAt: "desc" } },
        parent: true,
      },
    });

    if (!folder) {
      return res.json({
        success: false,
        message: "Folder not found",
      });
    }

    // Return JSON data instead of rendering a view
    return res.json({
      success: true,
      folder: folder,
      folders: folder.children,
      files: folder.files,
    });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: "Error loading folder",
    });
  }
});

// Rename folder - Updated to use JWT auth
router.post("/rename", authenticateJWT, async (req, res) => {
  try {
    const { folderId, name } = req.body;

    if (!folderId) {
      return res.json({ success: false, message: "Folder ID is required" });
    }

    // Check if folder exists and belongs to user
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: req.user.id }, // Using req.user from JWT
      include: { parent: true },
    });

    if (!folder) {
      return res.json({ success: false, message: "Folder not found" });
    }

    // Update the folder name
    await prisma.folder.update({
      where: { id: folderId },
      data: { name: name.trim() },
    });

    // Determine redirect URL - stay in parent folder or dashboard
    const redirectUrl = folder.parentId
      ? `/folders/${folder.parentId}`
      : "/dashboard";

    return res.json({
      success: true,
      message: "Folder renamed successfully",
      redirectUrl: redirectUrl,
    });
  } catch (error) {
    console.error("Rename folder error:", error);

    const { parentId } = req.body;
    const redirectUrl = parentId ? `/folders/${parentId}` : "/dashboard";

    return res.json({
      success: false,
      message: "Error renaming folder",
      redirectUrl: redirectUrl,
    });
  }
});

// Delete folder - Updated to use JWT auth
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.user.id }, // Using req.user from JWT
      include: { children: true, files: true, parent: true },
    });

    if (!folder) {
      return res.json({ success: false, message: "Folder not found" });
    }

    if (folder.children.length > 0 || folder.files.length > 0) {
      const redirectUrl = folder.parentId
        ? `/folders/${folder.parentId}`
        : "/dashboard";
      return res.json({
        success: false,
        message: "Cannot delete folder with contents",
        redirectUrl: redirectUrl,
      });
    }

    await prisma.folder.delete({ where: { id: req.params.id } });

    // Redirect to parent folder or dashboard
    const redirectUrl = folder.parentId
      ? `/folders/${folder.parentId}`
      : "/dashboard";

    return res.json({
      success: true,
      message: "Folder deleted successfully",
      redirectUrl: redirectUrl,
    });
  } catch (error) {
    console.error("Delete folder error:", error);

    const { parentId } = req.body;
    const redirectUrl = parentId ? `/folders/${parentId}` : "/dashboard";

    return res.json({
      success: false,
      message: "Error deleting folder",
      redirectUrl: redirectUrl,
    });
  }
});

module.exports = router;
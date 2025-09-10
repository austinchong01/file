const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Create folder
router.post('/create', ensureAuthenticated, async (req, res) => {
  try {
    const { name, parentId } = req.body;

    await prisma.folder.create({
      data: {
        name: name,
        userId: req.user.id,
        parentId: parentId || null
      }
    });


    return res.json({ success: true, message: 'Folder created successfully', redirectUrl: "/dashboard" });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error, redirectUrl: "/dashboard" });
  }
});

// View folder contents
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        children: { orderBy: { name: 'asc' } },
        files: { orderBy: { createdAt: 'desc' } },
        parent: true
      }
    });

    if (!folder) {
      return res.json({ success: false, message: 'Folder not found', redirectUrl: "/dashboard" });
    }

    // res.render('folder-view', {
    //   title: `Folder: ${folder.name}`,
    //   folder,
    //   folders: folder.children,
    //   files: folder.files
    // });
  } catch (error) {
    console.error(error);
    req.session.error_msg = 'Error loading folder';
    res.redirect('/dashboard');
  }
});

// Rename folder
router.post('/rename', ensureAuthenticated, async (req, res) => {
  try {
    const { folderId, name } = req.body;

    // Check if folder exists and belongs to user
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: req.user.id }
    });

    if (!folder) {
      return res.json({ success: false, message: 'Folder not found' });
    }

    // Update the folder name
    await prisma.folder.update({
      where: { id: folderId },
      data: { name: name.trim() }
    });

    return res.json({ 
      success: true, 
      message: 'Folder renamed successfully', 
      redirectUrl: "/dashboard" 
    });
  } catch (error) {
    console.error('Rename folder error:', error);
    return res.json({ 
      success: false, 
      message: 'Error renaming folder' 
    });
  }
});

// Delete folder
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { children: true, files: true }
    });

    if (!folder) {
      return res.json({ success: false, message: 'Folder not found', redirectUrl: "/dashboard" });
    }

    if (folder.children.length > 0 || folder.files.length > 0) {
      return res.json({ success: false, message: 'Cannot delete folder with contents', redirectUrl: "/dashboard" });
    }

    await prisma.folder.delete({ where: { id: req.params.id } });

    return res.json({ success: true, message: 'Folder deleted successfully', redirectUrl: "/dashboard" });
  } catch (error) {
    return res.json({ success: false, message: 'Error deleting folder', redirectUrl: "/dashboard" });
  }
});

module.exports = router;
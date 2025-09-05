const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Create folder
router.post('/create', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name) {
      req.flash('error_msg', 'Folder name is required');
      return res.redirect('/dashboard');
    }

    const folderData = {
      name: name,
      description: description || null,
      userId: req.user.id,
      parentId: parentId || null
    };

    await prisma.folder.create({
      data: folderData
    });

    req.flash('success_msg', 'Folder created successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating folder');
    res.redirect('/dashboard');
  }
});

// Get folder contents
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: {
        children: true,
        files: true,
        parent: true
      }
    });

    if (!folder) {
      req.flash('error_msg', 'Folder not found');
      return res.redirect('/dashboard');
    }

    res.render('folder-view', {
      title: `Folder: ${folder.name}`,
      folder: folder
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading folder');
    res.redirect('/dashboard');
  }
});

// Update folder
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description } = req.body;

    const folder = await prisma.folder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!folder) {
      req.flash('error_msg', 'Folder not found');
      return res.redirect('/dashboard');
    }

    await prisma.folder.update({
      where: { id: req.params.id },
      data: {
        name: name || folder.name,
        description: description
      }
    });

    req.flash('success_msg', 'Folder updated successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating folder');
    res.redirect('/dashboard');
  }
});

// Delete folder
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: {
        children: true,
        files: true
      }
    });

    if (!folder) {
      req.flash('error_msg', 'Folder not found');
      return res.redirect('/dashboard');
    }

    if (folder.children.length > 0 || folder.files.length > 0) {
      req.flash('error_msg', 'Cannot delete folder with contents');
      return res.redirect('/dashboard');
    }

    await prisma.folder.delete({
      where: { id: req.params.id }
    });

    req.flash('success_msg', 'Folder deleted successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting folder');
    res.redirect('/dashboard');
  }
});

module.exports = router;
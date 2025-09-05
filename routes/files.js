const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Add file type restrictions if needed
    cb(null, true);
  }
});

// Upload form
router.get('/upload', ensureAuthenticated, async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' }
    });
    
    res.render('upload', { 
      title: 'Upload File',
      folders: folders 
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading upload page');
    res.redirect('/dashboard');
  }
});

// Handle file upload
router.post('/upload', ensureAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'Please select a file');
      return res.redirect('/files/upload');
    }

    const fileData = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      userId: req.user.id,
      folderId: req.body.folderId || null
    };

    const savedFile = await prisma.file.create({
      data: fileData
    });

    req.flash('success_msg', 'File uploaded successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error uploading file');
    res.redirect('/files/upload');
  }
});

// File details
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: {
        folder: true
      }
    });

    if (!file) {
      req.flash('error_msg', 'File not found');
      return res.redirect('/dashboard');
    }

    res.render('file-details', {
      title: 'File Details',
      file: file
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading file details');
    res.redirect('/dashboard');
  }
});

// Download file
router.get('/:id/download', ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!file) {
      req.flash('error_msg', 'File not found');
      return res.redirect('/dashboard');
    }

    const filePath = path.join(__dirname, '..', file.path);
    
    if (!fs.existsSync(filePath)) {
      req.flash('error_msg', 'File not found on disk');
      return res.redirect('/dashboard');
    }

    res.download(filePath, file.originalName);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error downloading file');
    res.redirect('/dashboard');
  }
});

// Delete file
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!file) {
      req.flash('error_msg', 'File not found');
      return res.redirect('/dashboard');
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', file.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: req.params.id }
    });

    req.flash('success_msg', 'File deleted successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting file');
    res.redirect('/dashboard');
  }
});

module.exports = router;
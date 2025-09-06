const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { PrismaClient } = require('@prisma/client');
const { ensureAuthenticated } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

const router = express.Router();
const prisma = new PrismaClient();

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Generate folder path based on user and optional folder
    let folderPath = `file-uploader/users/${req.user.id}`;
    
    if (req.body.folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: req.body.folderId, userId: req.user.id }
      });
      if (folder) {
        folderPath += `/folders/${folder.name}`;
      }
    }

    return {
      folder: folderPath,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'mp4', 'mp3'],
      resource_type: 'auto', // Automatically detect file type
      public_id: `${Date.now()}-${file.originalname}`, // Unique filename
    };
  },
});

// Multer setup with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Optional: Add file type restrictions
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'video/mp4', 'audio/mp3', 'audio/mpeg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Upload form
router.get('/upload', ensureAuthenticated, async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' }
    });
    
    const selectedFolderId = req.query.folderId || null;
    
    res.render('upload', { 
      title: 'Upload File', 
      folders,
      selectedFolderId
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading upload page');
    res.redirect('/dashboard');
  }
});

// Handle upload
router.post('/upload', ensureAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'Please select a file');
      return res.redirect('/files/upload');
    }

    const { folderId } = req.body;

    // Validate folder ownership if folderId is provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId: req.user.id }
      });
      
      if (!folder) {
        // Delete uploaded file from Cloudinary since validation failed
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'auto' });
        req.flash('error_msg', 'Invalid folder selected');
        return res.redirect('/files/upload');
      }
    }

    // Save file info to database
    await prisma.file.create({
      data: {
        originalName: req.file.originalname,
        filename: req.file.filename, // Cloudinary public_id
        mimetype: req.file.mimetype,
        size: req.file.size,
        cloudinaryUrl: req.file.path, // Cloudinary URL
        cloudinaryPublicId: req.file.filename, // Cloudinary public_id
        userId: req.user.id,
        folderId: folderId || null
      }
    });

    req.flash('success_msg', 'File uploaded successfully to cloud storage');
    
    // Redirect to appropriate location
    if (folderId) {
      res.redirect(`/folders/${folderId}`);
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'auto' });
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    req.flash('error_msg', 'Error uploading file');
    res.redirect('/files/upload');
  }
});

// File details
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { folder: true }
    });

    if (!file) {
      req.flash('error_msg', 'File not found');
      return res.redirect('/dashboard');
    }

    res.render('file-details', { title: 'File Details', file });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading file');
    res.redirect('/dashboard');
  }
});

// Download file
router.get('/:id/download', ensureAuthenticated, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!file) {
      req.flash('error_msg', 'File not found');
      return res.redirect('/dashboard');
    }

    // Generate download URL with original filename
    const downloadUrl = cloudinary.url(file.cloudinaryPublicId, {
      flags: 'attachment',
      resource_type: 'auto'
    });

    res.redirect(downloadUrl);
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
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!file) {
      req.flash('error_msg', 'File not found');
      return res.redirect('/dashboard');
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
        resource_type: 'auto'
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion
    }

    // Delete from database
    await prisma.file.delete({ where: { id: req.params.id } });

    req.flash('success_msg', 'File deleted successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting file');
    res.redirect('/dashboard');
  }
});

module.exports = router;
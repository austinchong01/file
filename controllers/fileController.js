const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Get upload form
exports.getUploadForm = async (req, res) => {
  try {
    const userId = req.user.id;
    const folderId = req.query.folderId;
    
    const folders = await prisma.folder.findMany({
      where: { userId },
      orderBy: { name: 'asc' }
    });

    res.render('upload', { 
      title: 'Upload File', 
      folders,
      selectedFolderId: folderId || null
    });
  } catch (error) {
    console.error('Get upload form error:', error);
    req.flash('error_msg', 'Error loading upload page');
    res.redirect('/dashboard');
  }
};

// Handle file upload
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'Please select a file to upload');
      return res.redirect('/files/upload');
    }

    const { folderId } = req.body;
    const userId = req.user.id;

    // Validate folder ownership if folderId is provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId }
      });
      
      if (!folder) {
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        req.flash('error_msg', 'Invalid folder selected');
        return res.redirect('/files/upload');
      }
    }

    // Save file info to database
    await prisma.file.create({
      data: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        userId,
        folderId: folderId || null
      }
    });

    req.flash('success_msg', 'File uploaded successfully');
    
    // Redirect to folder or dashboard
    if (folderId) {
      res.redirect(`/folders/${folderId}`);
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Upload file error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    req.flash('error_msg', 'Error uploading file');
    res.redirect('/files/upload');
  }
};

// Get file details
exports.getFileDetails = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId },
      include: { folder: true }
    });

    if (!file) {
      req.flash('error_msg', 'File not found');
      return res.redirect('/dashboard');
    }

    res.render('file-details', { 
      title: `File: ${file.originalName}`,
      file 
    });
  } catch (error) {
    console.error('Get file details error:', error);
    req.flash('error_msg', 'Error loading file details');
    res.redirect('/dashboard');
  }
};

// Download file
exports.downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId }
    });

    if (!file) {
      req.flash('error_msg', 'File not found');
      return res.redirect('/dashboard');
    }

    const filePath = path.resolve(file.path);
    
    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      req.flash('error_msg', 'File not found on disk. It may have been moved or deleted.');
      return res.redirect('/dashboard');
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        req.flash('error_msg', 'Error downloading file');
        res.redirect('/dashboard');
      }
    });
  } catch (error) {
    console.error('Download file error:', error);
    if (!res.headersSent) {
      req.flash('error_msg', 'Error downloading file');
      res.redirect('/dashboard');
    }
  }
};

// Delete file
exports.deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId },
      include: { folder: true }
    });

    if (!file) {
      req.flash('error_msg', 'File not found');
      return res.redirect('/dashboard');
    }

    // Delete file from filesystem
    const filePath = path.resolve(file.path);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fsError) {
        console.error('Error deleting file from disk:', fsError);
        // Continue with database deletion even if file system deletion fails
      }
    }

    // Delete file record from database
    await prisma.file.delete({ where: { id: fileId } });

    req.flash('success_msg', 'File deleted successfully');
    
    // Redirect to folder or dashboard
    if (file.folderId) {
      res.redirect(`/folders/${file.folderId}`);
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Delete file error:', error);
    req.flash('error_msg', 'Error deleting file');
    res.redirect('/dashboard');
  }
};
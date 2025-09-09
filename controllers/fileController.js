const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('../config/cloudinary');

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
    req.session.error_msg = 'Error loading upload page';
    res.redirect('/dashboard');
  }
};

// Handle file upload
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      req.session.error_msg = 'Please select a file to upload';
      return res.redirect('/files/upload');
    }

    const { folderId, displayName } = req.body;
    const userId = req.user.id;

    // Validate folder ownership if folderId is provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId }
      });
      
      if (!folder) {
        req.session.error_msg = 'Invalid folder selected';
        return res.redirect('/files/upload');
      }
    }

    // Use displayName if provided, otherwise fall back to original name
    const finalDisplayName = displayName && displayName.trim() 
      ? displayName.trim() 
      : req.file.originalname;

    // File is already uploaded to Cloudinary via multer middleware
    // req.file contains the Cloudinary response
    const fileData = {
      originalName: req.file.originalname,
      displayName: finalDisplayName,
      filename: req.file.filename, // Cloudinary public_id
      mimetype: req.file.mimetype,
      size: req.file.size,
      cloudinaryUrl: req.file.path, // Cloudinary URL
      cloudinaryPublicId: req.file.filename, // Cloudinary public_id
      userId,
      folderId: folderId || null
    };

    // Save file info to database
    await prisma.file.create({
      data: fileData
    });

    req.session.success_msg = 'File uploaded successfully';
    
    // Redirect to folder or dashboard
    if (folderId) {
      res.redirect(`/folders/${folderId}`);
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Upload file error:', error);
    req.session.error_msg = 'Error uploading file';
    res.redirect('/files/upload');
  }
};

// Download file (redirect to Cloudinary URL)
exports.downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId }
    });

    if (!file) {
      req.session.error_msg = 'File not found';
      return res.redirect('/dashboard');
    }

    // Generate a download URL with the original filename
    const downloadUrl = cloudinary.url(file.cloudinaryPublicId, {
      flags: 'attachment',
      resource_type: 'auto'
    });

    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Download file error:', error);
    req.session.error_msg = 'Error downloading file';
    res.redirect('/dashboard');
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
      req.session.error_msg = 'File not found';
      return res.redirect('/dashboard');
    }

    // Delete file from Cloudinary
    try {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
        resource_type: 'auto'
      });
    } catch (cloudinaryError) {
      console.error('Error deleting file from Cloudinary:', cloudinaryError);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    // Delete file record from database
    await prisma.file.delete({ where: { id: fileId } });

    req.session.success_msg = 'File deleted successfully';
    
    // Redirect to folder or dashboard
    if (file.folderId) {
      res.redirect(`/folders/${file.folderId}`);
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Delete file error:', error);
    req.session.error_msg = 'Error deleting file';
    res.redirect('/dashboard');
  }
};
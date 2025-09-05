const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new folder
exports.createFolder = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      req.flash('error_msg', 'Folder name is required');
      return res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
    }

    // Check if folder with same name exists in the same location
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: name.trim(),
        userId,
        parentId: parentId || null
      }
    });

    if (existingFolder) {
      req.flash('error_msg', 'A folder with this name already exists in this location');
      return res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
    }

    await prisma.folder.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId,
        parentId: parentId || null
      }
    });

    req.flash('success_msg', 'Folder created successfully');
    res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
  } catch (error) {
    console.error('Create folder error:', error);
    req.flash('error_msg', 'Error creating folder');
    res.redirect('/dashboard');
  }
};

// Get folder contents
exports.getFolderContents = async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
      include: {
        children: { orderBy: { name: 'asc' } },
        files: { orderBy: { createdAt: 'desc' } },
        parent: true
      }
    });

    if (!folder) {
      req.flash('error_msg', 'Folder not found');
      return res.redirect('/dashboard');
    }

    res.render('folder-view', {
      title: `Folder: ${folder.name}`,
      folder,
      folders: folder.children,
      files: folder.files
    });
  } catch (error) {
    console.error('Get folder error:', error);
    req.flash('error_msg', 'Error loading folder');
    res.redirect('/dashboard');
  }
};

// Update folder
exports.updateFolder = async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;
    const { name, description } = req.body;

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId }
    });

    if (!folder) {
      req.flash('error_msg', 'Folder not found');
      return res.redirect('/dashboard');
    }

    if (!name || name.trim() === '') {
      req.flash('error_msg', 'Folder name is required');
      return res.redirect(`/folders/${folderId}`);
    }

    // Check if folder with same name exists in the same location (excluding current folder)
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: name.trim(),
        userId,
        parentId: folder.parentId,
        id: { not: folderId }
      }
    });

    if (existingFolder) {
      req.flash('error_msg', 'A folder with this name already exists in this location');
      return res.redirect(`/folders/${folderId}`);
    }

    await prisma.folder.update({
      where: { id: folderId },
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    req.flash('success_msg', 'Folder updated successfully');
    res.redirect(`/folders/${folderId}`);
  } catch (error) {
    console.error('Update folder error:', error);
    req.flash('error_msg', 'Error updating folder');
    res.redirect('/dashboard');
  }
};

// Delete folder
exports.deleteFolder = async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
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

    // Check if folder has contents
    if (folder.children.length > 0 || folder.files.length > 0) {
      req.flash('error_msg', 'Cannot delete folder with contents. Please move or delete all files and subfolders first.');
      return res.redirect(`/folders/${folderId}`);
    }

    await prisma.folder.delete({ where: { id: folderId } });

    req.flash('success_msg', 'Folder deleted successfully');
    
    // Redirect to parent folder or dashboard
    if (folder.parentId) {
      res.redirect(`/folders/${folder.parentId}`);
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Delete folder error:', error);
    req.flash('error_msg', 'Error deleting folder');
    res.redirect('/dashboard');
  }
};
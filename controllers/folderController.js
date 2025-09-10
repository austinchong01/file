// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// exports.createFolder = async (req, res) => {
//   try {
//     const { name, description, parentId } = req.body;
//     const userId = req.user.id;

//     if (!name || name.trim() === '') {
//       req.session.error_msg = 'Folder name is required';
//       return res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
//     }

//     const existingFolder = await prisma.folder.findFirst({
//       where: { name: name.trim(), userId, parentId: parentId || null }
//     });

//     if (existingFolder) {
//       req.session.error_msg = 'A folder with this name already exists in this location';
//       return res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
//     }

//     await prisma.folder.create({
//       data: {
//         name: name.trim(),
//         description: description?.trim() || null,
//         userId,
//         parentId: parentId || null
//       }
//     });

//     req.session.success_msg = 'Folder created successfully';
//     res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
//   } catch (error) {
//     req.session.error_msg = 'Error creating folder';
//     res.redirect('/dashboard');
//   }
// };

// exports.getFolderContents = async (req, res) => {
//   try {
//     const folder = await prisma.folder.findFirst({
//       where: { id: req.params.id, userId: req.user.id },
//       include: {
//         children: { orderBy: { name: 'asc' } },
//         files: { orderBy: { createdAt: 'desc' } },
//         parent: true
//       }
//     });

//     if (!folder) {
//       req.session.error_msg = 'Folder not found';
//       return res.redirect('/dashboard');
//     }

//     res.render('folder-view', {
//       title: `Folder: ${folder.name}`,
//       folder,
//       folders: folder.children,
//       files: folder.files
//     });
//   } catch (error) {
//     req.session.error_msg = 'Error loading folder';
//     res.redirect('/dashboard');
//   }
// };

// exports.updateFolder = async (req, res) => {
//   try {
//     const folderId = req.params.id;
//     const { name, description } = req.body;

//     const folder = await prisma.folder.findFirst({
//       where: { id: folderId, userId: req.user.id }
//     });

//     if (!folder) {
//       req.session.error_msg = 'Folder not found';
//       return res.redirect('/dashboard');
//     }

//     if (!name || name.trim() === '') {
//       req.session.error_msg = 'Folder name is required';
//       return res.redirect(`/folders/${folderId}`);
//     }

//     const existingFolder = await prisma.folder.findFirst({
//       where: { name: name.trim(), userId: req.user.id, parentId: folder.parentId, id: { not: folderId } }
//     });

//     if (existingFolder) {
//       req.session.error_msg = 'A folder with this name already exists in this location';
//       return res.redirect(`/folders/${folderId}`);
//     }

//     await prisma.folder.update({
//       where: { id: folderId },
//       data: { name: name.trim(), description: description?.trim() || null }
//     });

//     req.session.success_msg = 'Folder updated successfully';
//     res.redirect(`/folders/${folderId}`);
//   } catch (error) {
//     req.session.error_msg = 'Error updating folder';
//     res.redirect('/dashboard');
//   }
// };

// exports.deleteFolder = async (req, res) => {
//   try {
//     const folderId = req.params.id;

//     const folder = await prisma.folder.findFirst({
//       where: { id: folderId, userId: req.user.id },
//       include: { children: true, files: true, parent: true }
//     });

//     if (!folder) {
//       req.session.error_msg = 'Folder not found';
//       return res.redirect('/dashboard');
//     }

//     if (folder.children.length > 0 || folder.files.length > 0) {
//       req.session.error_msg = 'Cannot delete folder with contents. Please move or delete all files and subfolders first.';
//       return res.redirect(`/folders/${folderId}`);
//     }

//     await prisma.folder.delete({ where: { id: folderId } });

//     req.session.success_msg = 'Folder deleted successfully';
//     res.redirect(folder.parentId ? `/folders/${folder.parentId}` : '/dashboard');
//   } catch (error) {
//     req.session.error_msg = 'Error deleting folder';
//     res.redirect('/dashboard');
//   }
// };
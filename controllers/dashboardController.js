const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: { userId, parentId: null },
        orderBy: { name: 'asc' }
      }),
      prisma.file.findMany({
        where: { userId, folderId: null },
        orderBy: { createdAt: 'desc' },
        include: { folder: true }
      })
    ]);

    res.render('dashboard', { title: 'Dashboard', folders, files });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error_msg', 'Error loading dashboard');
    res.render('dashboard', { title: 'Dashboard', folders: [], files: [] });
  }
};
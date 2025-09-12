const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Home route - redirect to dashboard if authenticated, otherwise to login
router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login');
  }
});

// API test endpoint - NEW
router.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend connection successful!', 
    timestamp: new Date().toISOString(),
    status: 'connected'
  });
});

// Dashboard route - move the logic here
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
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
    res.render('dashboard', { title: 'Dashboard', folders: [], files: [] });
  }
});

module.exports = router;
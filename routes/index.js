const express = require('express');
const path = require('path');
const { ensureAuthenticated } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// API test endpoint
router.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend connection successful!', 
    timestamp: new Date().toISOString(),
    status: 'connected'
  });
});

// API route to get dashboard data
router.get('/api/dashboard', ensureAuthenticated, async (req, res) => {
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

    res.json({ 
      success: true, 
      folders, 
      files,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load dashboard data' 
    });
  }
});

// Serve React app for all non-API routes
router.get('*', (req, res) => {
  // In development, proxy to Vite dev server
  if (process.env.NODE_ENV === 'development') {
    return res.redirect('http://localhost:5173' + req.path);
  }
  
  // In production, serve built React app
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

module.exports = router;
const express = require('express');
const path = require('path');
const { ensureAuthenticated } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Test Frontend
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Hello from the backend!', 
    timestamp: new Date().toISOString(),
    status: 'connected'
  });
});

// API route to get dashboard data
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

module.exports = router;
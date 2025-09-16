const express = require('express');
const path = require('path');
const { authenticateJWT } = require('../middleware/jwtAuth'); // Updated import
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

// API route to get dashboard data - Updated to use JWT auth
router.get('/dashboard', authenticateJWT, async (req, res) => {
  console.log('=== DASHBOARD ROUTE ===');
  console.log('User from middleware:', req.user);
  
  try {
    const userId = req.user.id;
    console.log('Fetching data for user ID:', userId);
    
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

    console.log('Found folders:', folders.length);
    console.log('Found files:', files.length);
    console.log('✅ Dashboard data loaded successfully');

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
    console.error('❌ Dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load dashboard data' 
    });
  }
});

module.exports = router;
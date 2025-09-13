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
// router.get('/api/dashboard', ensureAuthenticated, async (req, res) => {
//   try {
//     const userId = req.user.id;
    
//     const [folders, files] = await Promise.all([
//       prisma.folder.findMany({
//         where: { userId, parentId: null },
//         orderBy: { name: 'asc' }
//       }),
//       prisma.file.findMany({
//         where: { userId, folderId: null },
//         orderBy: { createdAt: 'desc' },
//         include: { folder: true }
//       })
//     ]);

//     res.json({ 
//       success: true, 
//       folders, 
//       files,
//       user: {
//         id: req.user.id,
//         name: req.user.name,
//         email: req.user.email
//       }
//     });
//   } catch (error) {
//     console.error('Dashboard error:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Failed to load dashboard data' 
//     });
//   }
// });

// // Only serve React app for non-API routes in production
// // Remove the catch-all redirect in development
// router.get('*', (req, res) => {
//   // Don't redirect API routes or file routes
//   if (req.path.startsWith('/api/') || 
//       req.path.startsWith('/auth/') || 
//       req.path.startsWith('/files/') || 
//       req.path.startsWith('/folders/')) {
//     return res.status(404).json({ error: 'API endpoint not found' });
//   }

//   // In development, let React handle routing
//   if (process.env.NODE_ENV === 'development') {
//     return res.status(404).send('Route not found - handle in React app');
//   }
  
//   // In production, serve built React app
//   res.sendFile(path.join(__dirname, '../build/index.html'));
// });

module.exports = router;
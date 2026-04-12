const fs = require('fs');
const path = require('path');

// 1. Roadmaps
const roadmapsJsPath = path.join(__dirname, 'backend/src/routes/roadmaps.js');
const roadmapsCode = `
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../models');

router.get('/', async (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/:id', async (req, res) => {
  res.json({ success: true, data: { id: req.params.id, title: 'Roadmap Mock' } });
});

module.exports = router;
`;
fs.writeFileSync(roadmapsJsPath, roadmapsCode);

// 2. Creator
const creatorJsPath = path.join(__dirname, 'backend/src/routes/creator.js');
const creatorCode = `
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.get('/stats', authMiddleware, async (req, res) => {
  res.json({ success: true, data: { views: 0, likes: 0 } });
});

module.exports = router;
`;
fs.writeFileSync(creatorJsPath, creatorCode);

// 3. Register in index.js
const indexJsPath = path.join(__dirname, 'backend/src/index.js');
let indexCode = fs.readFileSync(indexJsPath, 'utf-8');
indexCode = indexCode.replace(
  "app.use('/api/v1/videos', videoRoutes);",
  "app.use('/api/v1/videos', videoRoutes);\napp.use('/api/v1/roadmaps', require('./routes/roadmaps'));\napp.use('/api/v1/creator', require('./routes/creator'));"
);
fs.writeFileSync(indexJsPath, indexCode);
console.log('Patched roadmaps & creator & index');

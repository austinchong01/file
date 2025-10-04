const multer = require("multer");

// Configure Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size
    files: 1,
  }, // Max 1 file
});

module.exports = upload;

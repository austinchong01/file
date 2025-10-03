const multer = require("multer");

// Configure Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size
    files: 1,
  }, // Max 1 file
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("application/") ||
      file.mimetype.startsWith("text/")
    ) {
      cb(null, true);
    } else {
      console.log(file.mimetype);
      cb(new Error("Only image/raw type files allowed"));
    }
  },
});

module.exports = upload;

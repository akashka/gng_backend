export {};
const express = require('express');
const multer = require('multer');
const router = express.Router();
const imageController = require('../../controllers/image.controller');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload image
router.post('/upload', upload.single('image'), imageController.uploadImage);

// Get image metadata
router.get('/:id', imageController.getImageById);

// View/download image
router.get('/:id/view', imageController.viewImage);

// Delete image (optional)
router.delete('/:id', imageController.deleteImage);

module.exports = router;

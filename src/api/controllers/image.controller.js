/* eslint-disable consistent-return */
// controllers/imageController.js
const Image = require('../models/images.model');

const imageController = {
  // Upload image
  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const { originalname, mimetype, buffer, size } = req.file;

      // Create new image document
      const image = new Image({
        filename: originalname,
        contentType: mimetype,
        data: buffer,
        size,
        uploadedAt: new Date()
      });

      // Save to database
      const savedImage = await image.save();

      res.status(201).json({
        success: true,
        imageId: savedImage._id,
        filename: savedImage.filename,
        size: savedImage.size,
        contentType: savedImage.contentType
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: 'Failed to upload image',
        details: error.message
      });
    }
  },

  // Get image metadata by ID
  getImageById: async (req, res) => {
    try {
      const { id } = req.params;

      const image = await Image.findById(id).select('-data');

      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }

      res.json({
        id: image._id,
        filename: image.filename,
        contentType: image.contentType,
        size: image.size,
        uploadedAt: image.uploadedAt
      });
    } catch (error) {
      console.error('Get image error:', error);
      res.status(500).json({
        error: 'Failed to retrieve image',
        details: error.message
      });
    }
  },

  // View/serve image
  viewImage: async (req, res) => {
    try {
      const { id } = req.params;

      const image = await Image.findById(id);

      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }

      // Set appropriate headers
      res.set({
        'Content-Type': image.contentType,
        'Content-Length': image.data.length,
        'Cache-Control': 'public, max-age=31536000',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*'
      });

      // Send image data
      res.send(image.data);
    } catch (error) {
      console.error('View image error:', error);
      res.status(500).json({
        error: 'Failed to serve image',
        details: error.message
      });
    }
  },

  // Delete image (optional)
  deleteImage: async (req, res) => {
    try {
      const { id } = req.params;

      const deletedImage = await Image.findByIdAndDelete(id);

      if (!deletedImage) {
        return res.status(404).json({ error: 'Image not found' });
      }

      res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({
        error: 'Failed to delete image',
        details: error.message
      });
    }
  }
};

module.exports = imageController;

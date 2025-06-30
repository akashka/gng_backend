export {};
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true
    },
    contentType: {
      type: String,
      required: true
    },
    data: {
      type: Buffer,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Optional: reference to user who uploaded
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
imageSchema.index({ uploadedAt: -1 });
imageSchema.index({ uploadedBy: 1 });

// Virtual for file size in human readable format
imageSchema.virtual('fileSizeFormatted').get(function () {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Method to get image without data (for metadata only)
imageSchema.methods.getMetadata = function () {
  return {
    id: this._id,
    filename: this.filename,
    contentType: this.contentType,
    size: this.size,
    fileSizeFormatted: this.fileSizeFormatted,
    uploadedAt: this.uploadedAt,
    uploadedBy: this.uploadedBy
  };
};

module.exports = mongoose.model('Image', imageSchema);

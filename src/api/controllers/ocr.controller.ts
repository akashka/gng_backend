import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { createWorker } from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import * as multer from 'multer';

// Define proper interface for Multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer: Buffer;
}

// Define types for the request body
interface OCRRequestBody {
  image: string | Buffer | MulterFile;
  type: 'base64' | 'url' | 'blob';
}

// Define response interface
interface OCRResponse {
  success: boolean;
  text?: string;
  error?: string;
  details?: string;
}

/**
 * Controller function to extract text from images using OCR
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function processImageOCR(req: Request, res: Response): Promise<void> {
  try {
    const { image, type } = req.body as OCRRequestBody;

    if (!image) {
      res.status(400).json({ success: false, error: 'Image is required' });
      return;
    }

    if (!type || !['base64', 'url', 'blob'].includes(type.toLowerCase())) {
      res.status(400).json({ success: false, error: 'Valid type is required: base64, url, or blob' });
      return;
    }

    // Process the image based on its type
    const tempFilePath = await saveImageToTemp(image, type.toLowerCase() as 'base64' | 'url' | 'blob');

    // Perform OCR on the image
    const extractedText = await performOCR(tempFilePath);

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    // Return the extracted text
    res.status(200).json({
      success: true,
      text: extractedText
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Save the image to a temporary file based on its type
 * @param {string | Buffer | MulterFile} image - The image data (base64 string, URL, or blob)
 * @param {string} type - The type of the image data (base64, url, or blob)
 * @returns {Promise<string>} - Path to the saved temporary file
 */
async function saveImageToTemp(image: string | Buffer | MulterFile, type: 'base64' | 'url' | 'blob'): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${uuidv4()}.png`);

  switch (type) {
    case 'base64':
      if (typeof image !== 'string') {
        throw new Error('Base64 image must be a string');
      }
      // Remove data URL prefix if it exists
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      await fs.promises.writeFile(tempFilePath, base64Data, { encoding: 'base64' });
      break;

    case 'url':
      if (typeof image !== 'string') {
        throw new Error('URL image must be a string');
      }
      const response = await axios.get(image, { responseType: 'arraybuffer' });
      await fs.promises.writeFile(tempFilePath, response.data);
      break;

    case 'blob':
      // Handle different types of blob data
      if (Buffer.isBuffer(image)) {
        await fs.promises.writeFile(tempFilePath, image);
      } else if (typeof image === 'object' && image !== null) {
        // If it's a multer file object
        const file = image as MulterFile;
        if (file.buffer) {
          await fs.promises.writeFile(tempFilePath, file.buffer);
        } else {
          throw new Error('Invalid Multer file: missing buffer');
        }
      } else {
        throw new Error('Invalid blob format');
      }
      break;

    default:
      throw new Error(`Unsupported image type: ${type}`);
  }

  return tempFilePath;
}

/**
 * Perform OCR on an image file
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Extracted text from the image
 */
async function performOCR(imagePath: string): Promise<string> {
  // Using the latest Tesseract.js API which follows the worker pattern
  const worker = await createWorker('eng');

  try {
    const result = await worker.recognize(imagePath);
    return result.data.text;
  } finally {
    // Always terminate the worker
    await worker.terminate();
  }
}

export default {
  processImageOCR
};

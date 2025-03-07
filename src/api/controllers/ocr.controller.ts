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

/**
 * Extract identification numbers from documents using OCR
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} documentType - Type of document: 'aadhaar', 'pan', or 'gst'
 * @returns {Promise<object>} Object containing the extracted ID number or error information
 */
async function extractDocumentNumber(
  base64Image: WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: 'string'): string },
  documentType: string
) {
  // Validate document type
  if (!['aadhaar', 'pan', 'gst'].includes(documentType.toLowerCase())) {
    return {
      success: false,
      error: 'Invalid document type. Must be "aadhaar", "pan", or "gst".'
    };
  }

  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Create temporary file to process (Tesseract works better with files)
    const tempFilePath = path.join(__dirname, 'temp_image.png');
    fs.writeFileSync(tempFilePath, imageBuffer);

    // Initialize tesseract worker
    const worker = await createWorker('eng');

    // Optimize OCR based on document type
    if (documentType.toLowerCase() === 'aadhaar') {
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789 '
      });
    } else if (documentType.toLowerCase() === 'pan') {
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      });
    }

    // Perform OCR
    const {
      data: { text }
    } = await worker.recognize(tempFilePath);

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    // Extract the appropriate number based on document type
    let extractedNumber = null;

    if (documentType.toLowerCase() === 'aadhaar') {
      // Aadhaar is a 12-digit number, often space or hyphen separated
      const aadhaarRegex = /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/;
      const match = text.match(aadhaarRegex);
      extractedNumber = match ? match[1].replace(/[\s-]/g, '') : null;
    } else if (documentType.toLowerCase() === 'pan') {
      // PAN is 10 characters: 5 letters, 4 numbers, 1 letter
      const panRegex = /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/;
      const match = text.match(panRegex);
      extractedNumber = match ? match[1] : null;
    } else if (documentType.toLowerCase() === 'gst') {
      // GST is 15 characters: 2 state code, 10 PAN, 1 entity, 1 check, 1 Z
      const gstRegex = /\b(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1})\b/;
      const match = text.match(gstRegex);
      extractedNumber = match ? match[1] : null;
    }

    await worker.terminate();

    if (extractedNumber) {
      return {
        success: true,
        documentType: documentType,
        idNumber: extractedNumber
      };
    } else {
      return {
        success: false,
        error: `Could not extract ${documentType} number from the image. Please ensure the image is clear.`
      };
    }
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      success: false,
      error: 'Error processing the document. Please try again with a clearer image.'
    };
  }
}

/**
 * Express middleware/handler for document OCR
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function handleDocumentOCR(req: Request, res: Response) {
  try {
    const { base64Image, documentType } = req.body;

    if (!base64Image) {
      return res.status(400).json({
        success: false,
        error: 'Missing base64 image data'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing document type'
      });
    }

    const result = await extractDocumentNumber(base64Image, documentType);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(422).json(result);
    }
  } catch (error) {
    console.error('Request handling error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error processing request'
    });
  }
}

export default {
  processImageOCR,
  handleDocumentOCR
};

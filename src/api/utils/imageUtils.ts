import { Url } from "url";

const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { Question, QuestionPaper, Answer, Report } = require('../../../src/api/models/questionpaper.model');

// Configure AWS
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

export function processQuestionImage(questionUuid: String, imageUrl: string | URL, retryCount = 3) {
    // Start processing without awaiting
    (async () => {
        try {
            // Download image
            const imageResponse = await axios({
                method: 'get',
                url: imageUrl,
                responseType: 'arraybuffer'
            });

            // Prepare S3 upload parameters
            const fileExtension = getFileExtensionFromUrl(imageUrl);
            const key = `questions/${questionUuid}/${uuidv4()}${fileExtension}`;
            
            const uploadParams = {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: key,
                Body: imageResponse.data,
                ContentType: imageResponse.headers['content-type'],
                ACL: 'public-read'
            };

            // Upload to S3
            const uploadResult = await s3.upload(uploadParams).promise();

            // Update database with new URL
            await Question.findOneAndUpdate(
                { uuid: questionUuid },
                { imgSrc: uploadResult.Location }
            );

            console.log(`Successfully processed image for question ${questionUuid}`);

        } catch (error) {
            console.error(`Error processing image for question ${questionUuid}:`, error);

            // Implement retry logic
            if (retryCount > 0) {
                console.log(`Retrying image processing for question ${questionUuid}. Attempts remaining: ${retryCount - 1}`);
                setTimeout(() => {
                    processQuestionImage(questionUuid, imageUrl, retryCount - 1);
                }, 5000); // Wait 5 seconds before retrying
            } else {
                // Log to error monitoring service or database
                await logImageProcessingError(questionUuid, imageUrl, error);
            }
        }
    })();
}

// Helper function to extract file extension
function getFileExtensionFromUrl(url: string | URL) {
    try {
        const pathname = new URL(url).pathname;
        const extension = pathname.split('.').pop();
        return extension ? `.${extension}` : '.jpg'; // Default to .jpg if no extension found
    } catch {
        return '.jpg'; // Default extension
    }
}

// Error logging function
async function logImageProcessingError(questionUuid: any, imageUrl: any, error: { message: any; }) {
    try {
        // You can implement your error logging logic here
        // For example, saving to a dedicated MongoDB collection
        const ImageProcessingError = mongoose.model('ImageProcessingError');
        await new ImageProcessingError({
            questionUuid,
            originalUrl: imageUrl,
            error: error.message,
            timestamp: new Date()
        }).save();
    } catch (logError) {
        console.error('Failed to log image processing error:', logError);
    }
}
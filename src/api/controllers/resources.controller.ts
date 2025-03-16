import { NextFunction, Request, Response } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';
import mongoose from 'mongoose';
import axios from 'axios';

// Import models with consistent import style
const Resources = require('../models/resources.model');
const User = require('../models/user.model');

// Create Anthropic client
const anthropic = new Anthropic({
  apiKey: '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'
});

async function generateContent(
  educationalSubject: string,
  educationalBoard: string,
  educationalClass: string,
  educationalTopic: string
) {
  const prompt = `Can you generate a nice educational content for ${educationalSubject} subject ${educationalBoard} board India for class ${educationalClass} on the topic ${educationalTopic}. This has to be like educational content which kids when sees or read can understand the topic. Use images, videos, and text and keep it nice trendy readable fun interactive. No limit on content length take your own space. Use audio text videos animations. I WANT THE COMPLETE DATA IN THE HTML SYNTAX SO THAT I CAN JUST DANGEROUSLY RENDER IT WITHIN MY REACT NATIVE CODE FOR THE USER. ALL THE CSS STYLING MUST BE INLINE.
    Please ensure the content is:
    1. Age-appropriate for class ${educationalClass}
    2. Aligned with ${educationalBoard} curriculum
    3. Interactive and engaging
    4. Uses multimedia elements
    5. Explains concepts clearly and simply`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 20000,
      temperature: 1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    });

    console.log('msg', JSON.stringify(msg));
    return msg.content[0];
  } catch (error) {
    console.error('Error in Claude API call:', error);
    throw error;
  }
}

const generateEducationalContent = async (req: Request, res: Response) => {
  try {
    const { educationalClass, educationalSubject, educationalTopic, educationalBoard, userId } = req.body;

    // Validate required fields
    if (!educationalClass || !educationalSubject || !educationalTopic || !educationalBoard || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: Class, Subject, Board, or Topic'
      });
    }

    // Process the response
    const generatedContent = await generateContent(
      educationalSubject,
      educationalBoard,
      educationalClass,
      educationalTopic
    );
    console.log('generatedContent', JSON.stringify(generatedContent));

    // Create new resource document
    const resources = new Resources({
      generatedContent,
      educationalClass,
      educationalTopic,
      generatedAt: new Date().toISOString(),
      educationalSubject,
      educationalBoard,
      userId
    });

    // Save to database
    const savedResources = await resources.save();

    // Return the generated HTML content
    return res.status(200).json({
      success: true,
      data: {
        content: generatedContent,
        metadata: {
          educationalClass,
          educationalTopic,
          generatedAt: new Date().toISOString(),
          educationalSubject,
          educationalBoard,
          userId
        },
        id: savedResources.id
      }
    });
    console.log('generatedContent', JSON.stringify(generatedContent));
  } catch (error) {
    console.error('Error generating educational content:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating educational content',
      error: error.message
    });
  }
};

const listResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await Resources.find();

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No resources found'
      });
    }

    // Use Promise.all for parallel user lookup
    const resourcesWithUsers = await Promise.all(
      data.map(async (resource: any) => {
        const user = await User.findById(resource.userId);
        return {
          ...resource.toObject(),
          user
        };
      })
    );

    return res.status(200).json({
      success: true,
      value: resourcesWithUsers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export { generateEducationalContent, listResources };

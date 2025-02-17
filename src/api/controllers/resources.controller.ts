export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const axios = require('axios');

const generateEducationalContent = async (
  req: { body: { educationalBoard: any; educationalClass: any; educationalSubject: any; educationalTopic: any } },
  res: {
    status: (arg0: number) => {
      (): any;
      new (): any;
      json: {
        (arg0: {
          success: boolean;
          message?: string;
          data?: { content: any; metadata: { class: any; subject: any; topic: any; generatedAt: string } };
          error?: any;
        }): any;
        new (): any;
      };
    };
  }
) => {
  try {
    const { educationalClass, educationalSubject, educationalTopic, educationalBoard } = req.body;

    // Validate required fields
    if (!educationalClass || !educationalSubject || !educationalTopic || educationalBoard) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: Class, Subject, Board, or Topic'
      });
    }

    // Claude API configuration
    const CLAUDE_API_KEY =
      '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';
    const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

    // Construct the prompt for Claude
    const prompt = `Can you generate a nice educational content for ${educationalSubject} subject ${educationalBoard} board India for class ${educationalClass} on the topic ${educationalTopic}. This has to be like educational content which kids when sees or read can understand the topic. Use images, videos, and text and keep it nice trendy readable fun interactive. No limit on content length take your own space. Use audio text videos animations. I WANT THE COMPLETE DATA IN THE HTML SYNTAX SO THAT I CAN JUST DANGEROUSLY RENDER IT WITHIN MY REACT NATIVE CODE FOR THE USER.

      Please ensure the content is:
      1. Age-appropriate for class ${educationalClass}
      2. Aligned with ${educationalBoard} curriculum
      3. Interactive and engaging
      4. Uses multimedia elements
      5. Explains concepts clearly and simply`;

    // Make API call to Claude
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    // Process the response
    const generatedContent = response.data.content[0].text;

    // Return the generated HTML content
    return res.status(200).json({
      success: true,
      data: {
        content: generatedContent,
        metadata: {
          class: educationalClass,
          subject: educationalSubject,
          topic: educationalTopic,
          generatedAt: new Date().toISOString()
        }
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

module.exports = {
  generateEducationalContent
};

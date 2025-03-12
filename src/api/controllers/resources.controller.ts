export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const axios = require('axios');
const Resources = require('../models/resources.model');
const User = require('../models/user.model');

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

    // Claude API configuration
    const CLAUDE_API_KEY = '';
    const CLAUDE_API_URL = '';

    // Construct the prompt for Claude
    const prompt = `Can you generate a nice educational content for ${educationalSubject} subject ${educationalBoard} board India for class ${educationalClass} on the topic ${educationalTopic}. This has to be like educational content which kids when sees or read can understand the topic. Use images, videos, and text and keep it nice trendy readable fun interactive. No limit on content length take your own space. Use audio text videos animations. I WANT THE COMPLETE DATA IN THE HTML SYNTAX SO THAT I CAN JUST DANGEROUSLY RENDER IT WITHIN MY REACT NATIVE CODE FOR THE USER.

      Please ensure the content is:
      1. Age-appropriate for class ${educationalClass}
      2. Aligned with ${educationalBoard} curriculum
      3. Interactive and engaging
      4. Uses multimedia elements
      5. Explains concepts clearly and simply`;

    // Make API call to Claude
    // const response = await axios.post(
    //   CLAUDE_API_URL,
    //   {
    //     model: 'claude-3-opus-20240229',
    //     max_tokens: 4000,
    //     messages: [
    //       {
    //         role: 'user',
    //         content: prompt
    //       }
    //     ]
    //   },
    //   {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'x-api-key': CLAUDE_API_KEY,
    //       'anthropic-version': '2023-06-01'
    //     }
    //   }
    // );

    const response = {
      data: {
        content: [
          {
            text: `
          <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Squares and Square Roots - CBSE Class 8</title>
        <style>
          * {
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
          }

          body {
            margin: 0;
            padding: 20px;
            background-color: #f9f9f9;
            color: #333;
            line-height: 1.6;
          }

          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            overflow: hidden;
          }

          header {
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }

          h1 {
            margin: 0;
            font-size: 2.5em;
          }

          section {
            padding: 20px 30px;
            margin-bottom: 20px;
          }

          h2 {
            color: #6a11cb;
            border-bottom: 2px solid #2575fc;
            padding-bottom: 10px;
            font-size: 1.8em;
          }

          h3 {
            color: #2575fc;
            font-size: 1.4em;
          }

          .activity-box {
            background-color: #f0f7ff;
            border-left: 5px solid #2575fc;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }

          .fun-fact {
            background-color: #fff0f7;
            border-left: 5px solid #ff4081;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }

          .example {
            background-color: #f1fff0;
            border-left: 5px solid #4caf50;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }

          .video-container {
            position: relative;
            padding-bottom: 56.25%;
            height: 0;
            margin: 20px 0;
          }

          .placeholder-img {
            width: 100%;
            max-width: 100%;
            height: auto;
            border-radius: 10px;
            margin: 15px 0;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
          }

          .math-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 10px;
            margin: 20px 0;
          }

          .grid-item {
            background-color: #e6f2ff;
            border-radius: 5px;
            padding: 10px;
            text-align: center;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
          }

          .grid-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          }

          .quiz-container {
            background-color: #f0f0ff;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
          }

          .quiz-question {
            margin-bottom: 15px;
            font-weight: bold;
          }

          .quiz-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
          }

          .quiz-option {
            background-color: white;
            border: 2px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            cursor: pointer;
            transition: background-color 0.3s;
          }

          .quiz-option:hover {
            background-color: #eaeaff;
          }

          .interactive-demo {
            border: 2px solid #6a11cb;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            background-color: #fafafa;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
          }

          th {
            background-color: #6a11cb;
            color: white;
          }

          tr:nth-child(even) {
            background-color: #f2f2f2;
          }

          button {
            background-color: #2575fc;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
          }

          button:hover {
            background-color: #6a11cb;
          }

          .summary-card {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 15px;
            margin: 10px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }

          footer {
            background-color: #333;
            color: white;
            text-align: center;
            padding: 20px;
            margin-top: 30px;
          }

          @media (max-width: 768px) {
            .quiz-options {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>🔢 Squares and Square Roots 🔍</h1>
            <p>Discover the fascinating world of squares and square roots!</p>
          </header>

          <section id="introduction">
            <h2>Introduction to Squares</h2>
            <p>Hello mathematicians! 👋 Today we're going to explore the magical world of <strong>squares</strong> and <strong>square roots</strong>. These concepts are not only important in mathematics but also in our daily lives!</p>

            <div class="fun-fact">
              <h3>🎮 Fun Fact:</h3>
              <p>Did you know that the chessboard is a perfect example of squares? It has 64 small squares arranged in an 8×8 grid!</p>
            </div>

            <h3>What is a Square Number?</h3>
            <p>A square number is the result when we multiply a number by itself. We write it as n², which is read as "n squared".</p>

            <div class="example">
              <p>For example:</p>
              <ul>
                <li>3² = 3 × 3 = 9</li>
                <li>5² = 5 × 5 = 25</li>
                <li>7² = 7 × 7 = 49</li>
              </ul>
            </div>

            <h3>Let's visualize square numbers!</h3>
            <img src="/api/placeholder/600/400" alt="Visual representation of square numbers using dots arranged in squares" class="placeholder-img" />

            <div class="math-grid">
              <div class="grid-item">1² = 1</div>
              <div class="grid-item">2² = 4</div>
              <div class="grid-item">3² = 9</div>
              <div class="grid-item">4² = 16</div>
              <div class="grid-item">5² = 25</div>
              <div class="grid-item">6² = 36</div>
              <div class="grid-item">7² = 49</div>
              <div class="grid-item">8² = 64</div>
              <div class="grid-item">9² = 81</div>
              <div class="grid-item">10² = 100</div>
              <div class="grid-item">11² = 121</div>
              <div class="grid-item">12² = 144</div>
            </div>
          </section>

          <section id="patterns">
            <h2>Interesting Patterns in Square Numbers</h2>

            <h3>Pattern 1: Odd Number Sums</h3>
            <p>Did you know that any square number can be expressed as the sum of consecutive odd numbers starting from 1?</p>

            <div class="example">
              <p>For example:</p>
              <ul>
                <li>1² = 1 = 1</li>
                <li>2² = 4 = 1 + 3</li>
                <li>3² = 9 = 1 + 3 + 5</li>
                <li>4² = 16 = 1 + 3 + 5 + 7</li>
                <li>5² = 25 = 1 + 3 + 5 + 7 + 9</li>
              </ul>
            </div>

            <div class="activity-box">
              <h3>👨‍🔬 Activity Time:</h3>
              <p>Try to find the pattern in the last digits of square numbers:</p>
              <p>1² = 1 (last digit: 1)</p>
              <p>2² = 4 (last digit: 4)</p>
              <p>3² = 9 (last digit: 9)</p>
              <p>4² = 16 (last digit: 6)</p>
              <p>5² = 25 (last digit: 5)</p>
              <p>Can you continue this pattern and check if it repeats?</p>
            </div>

            <h3>Pattern 2: Difference between consecutive square numbers</h3>
            <p>The difference between consecutive square numbers follows a pattern too!</p>

            <table>
              <tr>
                <th>Square Numbers</th>
                <th>Difference</th>
              </tr>
              <tr>
                <td>1² = 1</td>
                <td></td>
              </tr>
              <tr>
                <td>2² = 4</td>
                <td>4 - 1 = 3</td>
              </tr>
              <tr>
                <td>3² = 9</td>
                <td>9 - 4 = 5</td>
              </tr>
              <tr>
                <td>4² = 16</td>
                <td>16 - 9 = 7</td>
              </tr>
              <tr>
                <td>5² = 25</td>
                <td>25 - 16 = 9</td>
              </tr>
            </table>

            <p>Did you notice the pattern? The differences are consecutive odd numbers: 3, 5, 7, 9, ...</p>
          </section>

          <section id="perfect-squares">
            <h2>Perfect Squares and Properties</h2>

            <h3>Properties of Square Numbers</h3>
            <div class="summary-card">
              <p>1. The square of an integer is always non-negative.</p>
            </div>
            <div class="summary-card">
              <p>2. Square numbers end only in 0, 1, 4, 5, 6, or 9.</p>
            </div>
            <div class="summary-card">
              <p>3. The square of an even number is even, and the square of an odd number is odd.</p>
            </div>
            <div class="summary-card">
              <p>4. If a number ends in 5, its square ends in 25.</p>
            </div>

            <div class="interactive-demo">
              <h3>✨ Detecting Perfect Squares</h3>
              <p>A number is a perfect square if its square root is a whole number.</p>
              <p>For example, 16 is a perfect square because √16 = 4, which is a whole number.</p>
              <p>But 15 is not a perfect square because √15 ≈ 3.87, which is not a whole number.</p>
            </div>
          </section>

          <section id="square-roots">
            <h2>Understanding Square Roots</h2>

            <p>The square root of a number is a value that, when multiplied by itself, gives the original number.</p>
            <p>We use the symbol '√' to denote a square root.</p>

            <div class="example">
              <p>For example:</p>
              <ul>
                <li>√25 = 5 because 5 × 5 = 25</li>
                <li>√81 = 9 because 9 × 9 = 81</li>
                <li>√100 = 10 because 10 × 10 = 100</li>
              </ul>
            </div>

            <h3>Finding Square Roots</h3>
            <p>There are several methods to find square roots:</p>

            <div class="summary-card">
              <h4>1. Prime Factorization Method</h4>
              <p>Express the number as a product of prime factors, then group them in pairs to find the square root.</p>
              <p>Example: To find √144</p>
              <p>144 = 2 × 2 × 2 × 2 × 3 × 3</p>
              <p>Grouping in pairs: (2 × 2) × (2 × 2) × (3 × 3)</p>
              <p>So, √144 = 2 × 2 × 3 = 12</p>
            </div>

            <div class="summary-card">
              <h4>2. Long Division Method</h4>
              <img src="/api/placeholder/600/400" alt="Square root calculation using long division method" class="placeholder-img" />
            </div>

            <div class="activity-box">
              <h3>🔍 Try It Yourself:</h3>
              <p>Find the square root of the following numbers using the prime factorization method:</p>
              <ol>
                <li>√196</li>
                <li>√324</li>
                <li>√400</li>
              </ol>
            </div>
          </section>

          <section id="estimating-square-roots">
            <h2>Estimating Square Roots</h2>

            <p>Not all numbers are perfect squares. So, how do we find the square root of numbers like 10, 20, or 30?</p>

            <h3>Finding Square Roots Between Perfect Squares</h3>
            <p>To estimate the square root of a number that is not a perfect square, we need to identify the perfect squares it lies between.</p>

            <div class="example">
              <p>For example, to estimate √20:</p>
              <ol>
                <li>Find the perfect squares on either side: 16 and 25</li>
                <li>√16 = 4 and √25 = 5</li>
                <li>Since 20 is closer to 16 than to 25, √20 is closer to 4 than to 5</li>
                <li>More precisely, √20 ≈ 4.47</li>
              </ol>
            </div>

            <div class="fun-fact">
              <h3>📱 Real-Life Application:</h3>
              <p>Square roots are used in many fields! For instance, in physics, the formula for the speed of a wave uses square roots. In architecture, square roots help calculate the diagonal of a square room!</p>
            </div>
          </section>

          <section id="quiz">
            <h2>Test Your Knowledge</h2>

            <div class="quiz-container">
              <div class="quiz-question">
                <p>1. What is the square of 13?</p>
              </div>
              <div class="quiz-options">
                <div class="quiz-option">A) 26</div>
                <div class="quiz-option">B) 169</div>
                <div class="quiz-option">C) 196</div>
                <div class="quiz-option">D) 269</div>
              </div>

              <div class="quiz-question">
                <p>2. What is the square root of 144?</p>
              </div>
              <div class="quiz-options">
                <div class="quiz-option">A) 12</div>
                <div class="quiz-option">B) 13</div>
                <div class="quiz-option">C) 14</div>
                <div class="quiz-option">D) 24</div>
              </div>

              <div class="quiz-question">
                <p>3. Which of these is NOT a perfect square?</p>
              </div>
              <div class="quiz-options">
                <div class="quiz-option">A) 64</div>
                <div class="quiz-option">B) 81</div>
                <div class="quiz-option">C) 90</div>
                <div class="quiz-option">D) 100</div>
              </div>

              <div class="quiz-question">
                <p>4. What is the square root of 0.25?</p>
              </div>
              <div class="quiz-options">
                <div class="quiz-option">A) 0.5</div>
                <div class="quiz-option">B) 0.05</div>
                <div class="quiz-option">C) 5</div>
                <div class="quiz-option">D) 0.025</div>
              </div>

              <div class="quiz-question">
                <p>5. Which number is between √24 and √25?</p>
              </div>
              <div class="quiz-options">
                <div class="quiz-option">A) 4.5</div>
                <div class="quiz-option">B) 4.9</div>
                <div class="quiz-option">C) 5.1</div>
                <div class="quiz-option">D) 5.5</div>
              </div>
            </div>
          </section>

          <section id="project">
            <h2>Mini-Project: Square Number Detective</h2>

            <div class="activity-box">
              <h3>🕵️‍♂️ Project Instructions:</h3>
              <p>Create a "Square Number Detective" diary for one week. Each day, try to spot at least three real-life examples of squares or square roots:</p>
              <ul>
                <li>Look at tiles on floors or walls</li>
                <li>Check out chessboards or similar game boards</li>
                <li>Notice square gardens or parks</li>
                <li>Observe square windows or picture frames</li>
                <li>Find out if any calculations at home involve square roots</li>
              </ul>
              <p>Take notes or pictures and share your findings with the class!</p>
            </div>
          </section>

          <section id="summary">
            <h2>Key Takeaways</h2>

            <div class="summary-card">
              <h3>Squares:</h3>
              <p>A square number is the product of a number multiplied by itself.</p>
              <p>Example: 7² = 7 × 7 = 49</p>
            </div>

            <div class="summary-card">
              <h3>Square Roots:</h3>
              <p>The square root of a number is a value that, when multiplied by itself, gives the original number.</p>
              <p>Example: √36 = 6 because 6 × 6 = 36</p>
            </div>

            <div class="summary-card">
              <h3>Properties:</h3>
              <ul>
                <li>Square numbers are always non-negative</li>
                <li>Square numbers have specific last digits (0, 1, 4, 5, 6, or 9)</li>
                <li>Square numbers follow patterns in their differences</li>
              </ul>
            </div>

            <div class="summary-card">
              <h3>Methods for Finding Square Roots:</h3>
              <ul>
                <li>Prime factorization method</li>
                <li>Long division method</li>
                <li>Estimation between known perfect squares</li>
              </ul>
            </div>
          </section>

          <footer>
            <p>© 2025 CBSE Mathematics Class 8 - Squares and Square Roots</p>
            <p>Created with ❤️ for curious young minds!</p>
          </footer>
        </div>

        <script>
          // You can add JavaScript for interactivity here
          // For example, to check quiz answers or create animations

          document.addEventListener('DOMContentLoaded', function() {
            // Quiz functionality
            const quizOptions = document.querySelectorAll('.quiz-option');

            quizOptions.forEach(option => {
              option.addEventListener('click', function() {
                const questionOptions = this.parentElement.querySelectorAll('.quiz-option');

                // Reset all options in this question
                questionOptions.forEach(opt => {
                  opt.style.backgroundColor = 'white';
                  opt.style.borderColor = '#ddd';
                });

                // Highlight selected option
                this.style.backgroundColor = '#e6f2ff';
                this.style.borderColor = '#2575fc';
              });
            });

            // Add more interactive elements as needed
          });
        </script>
      </body>
      </html>
          `
          }
        ]
      }
    };

    // Process the response
    const generatedContent = response.data.content[0].text;

    const resources = new Resources({
      generatedContent,
      educationalClass,
      educationalTopic,
      generatedAt: new Date().toISOString(),
      educationalSubject,
      educationalBoard,
      userId
    });

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

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Data not found'
      });
    }

    data.map(async (d: any) => {
      d.user = await User.findById(d.userId);
    });

    return res.status(200).json({
      success: true,
      value: data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  generateEducationalContent,
  listResources
};

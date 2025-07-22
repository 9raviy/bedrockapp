const bedrockClient = require("../utils/bedrockClient");

// Helper to build prompt for AWS Certification Exam Questions
function buildQuizPrompt(quizType, questionNumber, lastQuestion, lastAnswer, wasCorrect) {
  // Quiz type specific configurations
  const quizConfigs = {
    'ai-practitioner': {
      examName: 'AWS AI Practitioner',
      services: 'Amazon Bedrock, SageMaker, Comprehend, Rekognition, Polly, Transcribe, Translate, Textract, Lex, Kendra, Personalize, Forecast, CodeWhisperer, Q Business',
      focus: 'AWS AI/ML services, AI governance, ethics, responsible AI practices, AI/ML model deployment, monitoring, and lifecycle management, cost optimization and security best practices for AI workloads'
    },
    'solutions-architect': {
      examName: 'AWS Certified Solutions Architect Associate',
      services: 'EC2, S3, VPC, RDS, Lambda, CloudFront, Route 53, IAM, CloudFormation, ELB, Auto Scaling, CloudWatch, SNS, SQS, API Gateway, DynamoDB, ElastiCache, EFS, EBS',
      focus: 'AWS core services, architectural best practices, high availability, fault tolerance, scalability, security, cost optimization, disaster recovery, networking, storage solutions'
    }
  };

  const config = quizConfigs[quizType] || quizConfigs['ai-practitioner'];
  
  if (!lastQuestion) {
    // First question
    return `Generate a multiple choice quiz question for the ${config.examName} exam. This is question ${questionNumber} of 10.

Format your response as a JSON object with this exact structure:
{
  "question": "Your question here?",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "A"
}

Requirements:
- Focus on: ${config.focus}
- Key AWS services: ${config.services}
- Create 4 options (A, B, C, D) with only 1 correct answer
- Make incorrect options plausible but clearly wrong
- Use realistic AWS scenarios and use cases
- Return ONLY the JSON object, no other text`;
  } else if (wasCorrect) {
    return `The user answered the previous ${config.examName} exam question correctly. Generate the next question (${questionNumber} of 10).

Format your response as a JSON object with this exact structure:
{
  "question": "Your question here?",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "A"
}

Requirements:
- Focus on: ${config.focus}
- Key AWS services: ${config.services}
- Create 4 options (A, B, C, D) with only 1 correct answer
- Make incorrect options plausible but clearly wrong
- Use realistic AWS scenarios and use cases
- Ensure this question covers a different AWS service or concept than the previous question
- Return ONLY the JSON object, no other text`;
  } else {
    return `The user answered the previous ${config.examName} exam question incorrectly. Generate the next question (${questionNumber} of 10).

Format your response as a JSON object with this exact structure:
{
  "question": "Your question here?",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "A"
}

Requirements:
- Focus on: ${config.focus}
- Key AWS services: ${config.services}
- Create 4 options (A, B, C, D) with only 1 correct answer
- Make incorrect options plausible but clearly wrong
- Use realistic AWS scenarios and use cases
- Ensure this question covers a different AWS service or concept than the previous question
- Return ONLY the JSON object, no other text`;
  }
}

exports.handler = async (event) => {
  // Add CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
  };

  console.log("Event received:", JSON.stringify(event, null, 2));
  console.log("HTTP Method:", event.httpMethod);

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === "OPTIONS") {
    console.log("Handling OPTIONS request for CORS preflight");
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight response" }),
    };
  }

  try {
    // Parse the request body if it's a string
    const requestBody =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    // Extract quiz state from request body - Updated for multiple quiz types
    const {
      quizType = 'ai-practitioner', // Default to AI Practitioner
      lastQuestion = null,
      lastAnswer = null, // This will be "A", "B", "C", or "D"
      lastCorrectAnswer = null, // We'll need this to check answers
      score = 0,
      questionNumber = 1, // Track which question we're on (1-10)
      wasCorrect = null,
    } = requestBody || event;

    // Check if quiz is complete
    if (questionNumber > 10) {
      const finalPercentage = Math.round((score / 10) * 100);
      const quizNames = {
        'ai-practitioner': 'AWS AI Practitioner',
        'solutions-architect': 'AWS Certified Solutions Architect Associate'
      };
      const examName = quizNames[quizType] || 'AWS AI Practitioner';
      
      let resultMessage = "";

      if (finalPercentage >= 70) {
        resultMessage =
          `Congratulations! You passed the ${examName} practice exam!`;
      } else {
        resultMessage =
          `Keep studying! You need 70% to pass the ${examName} exam.`;
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          quizComplete: true,
          quizType: quizType,
          examName: examName,
          finalScore: score,
          totalQuestions: 10,
          percentage: finalPercentage,
          message: resultMessage,
          feedback: {
            result: finalPercentage >= 70 ? "Passed" : "Failed",
            explanation: `You scored ${score}/10 (${finalPercentage}%). ${resultMessage}`,
          },
        }),
      };
    }

    // If there was a previous question, check the answer
    let updatedScore = score;
    let updatedQuestionNumber = questionNumber;
    let answerFeedback = null;

    if (lastQuestion && lastAnswer && lastCorrectAnswer) {
      console.log("Checking answer for question:", lastQuestion);
      console.log("User's answer:", lastAnswer);
      console.log("Correct answer:", lastCorrectAnswer);

      // ✅ IMPROVED: Direct comparison for multiple choice
      const isCorrect =
        lastAnswer.toUpperCase() === lastCorrectAnswer.toUpperCase();

      console.log("Is answer correct?", isCorrect);

      if (isCorrect) {
        answerFeedback = {
          result: "Correct",
          explanation: "Well done! That's the correct answer.",
        };
        updatedScore += 1;
        console.log("Answer was correct, updated score:", updatedScore);
      } else {
        console.log("Answer was incorrect, getting explanation...");

        // ✅ IMPROVED: Quiz type specific explanation prompt
        const quizNames = {
          'ai-practitioner': 'AWS AI Practitioner',
          'solutions-architect': 'AWS Certified Solutions Architect Associate'
        };
        const examName = quizNames[quizType] || 'AWS AI Practitioner';
        const focusArea = quizType === 'solutions-architect' 
          ? 'AWS architectural best practices and core services'
          : 'AWS AI/ML services';
          
        const explanationPrompt = `A student answered an ${examName} exam question incorrectly.

Question: "${lastQuestion}"
Student's Answer: "${lastAnswer}"
Correct Answer: "${lastCorrectAnswer}"

Provide a concise explanation focusing on ${focusArea} in this format:
"The correct answer is ${lastCorrectAnswer}. Your choice ${lastAnswer} is incorrect because [BRIEF REASON]. [ONE EDUCATIONAL FACT about the AWS service or concept]."

Keep it educational and AWS-focused, under 60 words:`;

        const explanationResponse = await bedrockClient.queryBedrock(
          explanationPrompt
        );
        console.log("Explanation response:", explanationResponse);

        answerFeedback = {
          result: "Incorrect",
          explanation:
            explanationResponse.response || "No explanation available.",
        };
        console.log("Final answerFeedback object:", answerFeedback);
      }

      // Move to next question
      updatedQuestionNumber = questionNumber + 1;
    }

    // Build prompt for next question
    const isCorrectAnswer =
      answerFeedback && answerFeedback.result === "Correct";
    const quizPrompt = buildQuizPrompt(
      quizType,
      updatedQuestionNumber,
      lastQuestion,
      lastAnswer,
      isCorrectAnswer
    );

    console.log("Quiz prompt:", quizPrompt);
    const quizResponse = await bedrockClient.queryBedrock(quizPrompt);
    console.log("Raw quiz response:", quizResponse.response);

    // ✅ NEW: Parse the JSON response for multiple choice question
    let questionData;
    try {
      // Clean the response and parse JSON
      let cleanResponse = quizResponse.response.trim();

      // Remove any markdown code blocks if present
      cleanResponse = cleanResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");

      // Find JSON object in the response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      questionData = JSON.parse(cleanResponse);
      console.log("Parsed question data:", questionData);

      // Validate the structure
      if (
        !questionData.question ||
        !questionData.options ||
        !questionData.correctAnswer
      ) {
        throw new Error("Invalid question structure");
      }

      // Ensure we have 4 options
      if (
        !Array.isArray(questionData.options) ||
        questionData.options.length !== 4
      ) {
        throw new Error("Must have exactly 4 options");
      }
    } catch (parseError) {
      console.error("Error parsing question JSON:", parseError);
      console.error("Raw response:", quizResponse.response);

      // Fallback questions based on quiz type
      const fallbackQuestions = {
        'ai-practitioner': {
          question: "Which AWS service is designed to help developers build conversational interfaces using voice and text?",
          options: [
            "A) Amazon Comprehend",
            "B) Amazon Lex", 
            "C) Amazon Polly",
            "D) Amazon Transcribe",
          ],
          correctAnswer: "B",
        },
        'solutions-architect': {
          question: "Which AWS service provides a managed NoSQL database with fast and predictable performance?",
          options: [
            "A) Amazon RDS",
            "B) Amazon Redshift",
            "C) Amazon DynamoDB",
            "D) Amazon ElastiCache",
          ],
          correctAnswer: "C",
        }
      };

      questionData = fallbackQuestions[quizType] || fallbackQuestions['ai-practitioner'];
    }

    const finalResponse = {
      quizType: quizType,
      nextQuestion: questionData.question,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
      score: updatedScore,
      questionNumber: updatedQuestionNumber,
      totalQuestions: 10,
      progress: Math.round((updatedQuestionNumber / 10) * 100),
      feedback: answerFeedback,
    };

    console.log(
      "Final response being sent:",
      JSON.stringify(finalResponse, null, 2)
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(finalResponse),
    };
  } catch (error) {
    console.error("Error querying Bedrock:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

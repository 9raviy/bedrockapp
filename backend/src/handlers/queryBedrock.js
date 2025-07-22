const bedrockClient = require("../utils/bedrockClient");

// Helper to build prompt for AWS AI Practitioner Exam Questions
function buildQuizPrompt(questionNumber, lastQuestion, lastAnswer, wasCorrect) {
  if (!lastQuestion) {
    // First question
    return `Generate a multiple choice quiz question for the AWS AI Practitioner exam. This is question ${questionNumber} of 10.

Format your response as a JSON object with this exact structure:
{
  "question": "Your question here?",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "A"
}

Requirements:
- Focus on AWS AI/ML services: Amazon Bedrock, SageMaker, Comprehend, Rekognition, Polly, Transcribe, Translate, Textract, Lex, Kendra, Personalize, Forecast, CodeWhisperer, Q Business
- Include AWS AI governance, ethics, responsible AI practices
- Cover AI/ML model deployment, monitoring, and lifecycle management
- Include cost optimization and security best practices for AI workloads
- Create 4 options (A, B, C, D) with only 1 correct answer
- Make incorrect options plausible but clearly wrong
- Use realistic AWS scenarios and use cases
- Return ONLY the JSON object, no other text`;
  } else if (wasCorrect) {
    return `The user answered the previous AWS AI Practitioner exam question correctly. Generate the next question (${questionNumber} of 10).

Format your response as a JSON object with this exact structure:
{
  "question": "Your question here?",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "A"
}

Requirements:
- Focus on AWS AI/ML services: Amazon Bedrock, SageMaker, Comprehend, Rekognition, Polly, Transcribe, Translate, Textract, Lex, Kendra, Personalize, Forecast, CodeWhisperer, Q Business
- Include AWS AI governance, ethics, responsible AI practices
- Cover AI/ML model deployment, monitoring, and lifecycle management
- Include cost optimization and security best practices for AI workloads
- Create 4 options (A, B, C, D) with only 1 correct answer
- Make incorrect options plausible but clearly wrong
- Use realistic AWS scenarios and use cases
- Ensure this question covers a different AWS AI service or concept than the previous question
- Return ONLY the JSON object, no other text`;
  } else {
    return `The user answered the previous AWS AI Practitioner exam question incorrectly. Generate the next question (${questionNumber} of 10).

Format your response as a JSON object with this exact structure:
{
  "question": "Your question here?",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "A"
}

Requirements:
- Focus on AWS AI/ML services: Amazon Bedrock, SageMaker, Comprehend, Rekognition, Polly, Transcribe, Translate, Textract, Lex, Kendra, Personalize, Forecast, CodeWhisperer, Q Business
- Include AWS AI governance, ethics, responsible AI practices
- Cover AI/ML model deployment, monitoring, and lifecycle management
- Include cost optimization and security best practices for AI workloads
- Create 4 options (A, B, C, D) with only 1 correct answer
- Make incorrect options plausible but clearly wrong
- Use realistic AWS scenarios and use cases
- Ensure this question covers a different AWS AI service or concept than the previous question
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

    // Extract quiz state from request body - Updated for AWS AI Practitioner exam
    const {
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
      let resultMessage = "";
      
      if (finalPercentage >= 70) {
        resultMessage = "Congratulations! You passed the AWS AI Practitioner practice exam!";
      } else {
        resultMessage = "Keep studying! You need 70% to pass the AWS AI Practitioner exam.";
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          quizComplete: true,
          finalScore: score,
          totalQuestions: 10,
          percentage: finalPercentage,
          message: resultMessage,
          feedback: {
            result: finalPercentage >= 70 ? "Passed" : "Failed",
            explanation: `You scored ${score}/10 (${finalPercentage}%). ${resultMessage}`
          }
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

        // ✅ IMPROVED: AWS AI Practitioner specific explanation prompt
        const explanationPrompt = `A student answered an AWS AI Practitioner exam question incorrectly.

Question: "${lastQuestion}"
Student's Answer: "${lastAnswer}"
Correct Answer: "${lastCorrectAnswer}"

Provide a concise explanation focusing on AWS AI/ML services in this format:
"The correct answer is ${lastCorrectAnswer}. Your choice ${lastAnswer} is incorrect because [BRIEF REASON]. [ONE EDUCATIONAL FACT about the AWS AI/ML service or concept]."

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

      // AWS AI Practitioner fallback question
      questionData = {
        question: "Which AWS service is designed to help developers build conversational interfaces using voice and text?",
        options: [
          "A) Amazon Comprehend", 
          "B) Amazon Lex", 
          "C) Amazon Polly", 
          "D) Amazon Transcribe"
        ],
        correctAnswer: "B",
      };
    }

    const finalResponse = {
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

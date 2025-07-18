const bedrockClient = require("../utils/bedrockClient");

// Helper to build prompt for Bedrock
function buildQuizPrompt(difficulty, lastQuestion, lastAnswer, wasCorrect) {
  if (!lastQuestion) {
    // First question
    return `Generate a quiz question for a user. The difficulty level is ${difficulty}. Only return the question text.`;
  } else if (wasCorrect) {
    return `The user answered the previous question correctly. Increase the difficulty to ${difficulty}. Generate a new quiz question. Only return the question text.`;
  } else {
    return `The user answered the previous question incorrectly. Keep the difficulty at ${difficulty}. Generate a new quiz question. Only return the question text.`;
  }
}

exports.handler = async (event) => {
  // Add CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === "OPTIONS") {
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

    // Extract quiz state from request body
    const {
      lastQuestion = null,
      lastAnswer = null,
      score = 0,
      difficulty = 1,
      wasCorrect = null,
    } = requestBody || event;

    // If there was a previous question, check the answer
    let updatedScore = score;
    let updatedDifficulty = difficulty;
    let answerFeedback = null;

    if (lastQuestion && lastAnswer) {
      // Ask Bedrock to check the answer
      const checkPrompt = `Question: ${lastQuestion}\nUser's Answer: ${lastAnswer}\nIs this correct? Reply "true" or "false".`;
      const checkResponse = await bedrockClient.queryBedrock(checkPrompt);
      const isCorrect = (checkResponse.response || "")
        .toLowerCase()
        .includes("true");
      answerFeedback = isCorrect ? "Correct!" : "Incorrect.";
      if (isCorrect) {
        updatedScore += 1;
        updatedDifficulty += 1; // Increase difficulty
      } else {
        // Optionally decrease difficulty or keep the same
        updatedDifficulty = Math.max(1, updatedDifficulty - 1);
      }
    }

    // Build prompt for next question
    const quizPrompt = buildQuizPrompt(
      updatedDifficulty,
      lastQuestion,
      lastAnswer,
      answerFeedback === "Correct!"
    );
    const quizResponse = await bedrockClient.queryBedrock(quizPrompt);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        nextQuestion: quizResponse.response,
        score: updatedScore,
        difficulty: updatedDifficulty,
        feedback: answerFeedback,
      }),
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

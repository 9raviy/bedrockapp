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
      console.log("Checking answer for question:", lastQuestion);
      console.log("User's answer:", lastAnswer);

      // ✅ IMPROVED: Better prompt with clear instructions
      const checkPrompt = `You are an answer checker. 

Question: "${lastQuestion}"
Student's Answer: "${lastAnswer}"

Instructions: 
- If the answer is correct, respond with exactly: CORRECT
- If the answer is incorrect, respond with exactly: INCORRECT
- Do not include any explanation or other text in your response.

Your response:`;

      const checkResponse = await bedrockClient.queryBedrock(checkPrompt);
      console.log("Answer check response:", checkResponse);

      const responseText = (checkResponse.response || "").trim().toUpperCase();

      // ✅ FIXED: Exact matching with fallbacks
      const isCorrect =
        responseText === "CORRECT" ||
        responseText.startsWith("CORRECT.") ||
        responseText.startsWith("CORRECT!") ||
        (responseText.includes("CORRECT") &&
          !responseText.includes("INCORRECT"));

      console.log("Response text:", responseText);
      console.log("Is answer correct?", isCorrect);

      if (isCorrect) {
        answerFeedback = {
          result: "Correct",
          explanation: "Well done! That's the correct answer.",
        };
        updatedScore += 1;
        updatedDifficulty = Math.min(10, updatedDifficulty + 1); // Cap at difficulty 10
        console.log("Answer was correct, updated score:", updatedScore);
      } else {
        console.log("Answer was incorrect, getting explanation...");

        // ✅ IMPROVED: Concise explanation prompt
        const explanationPrompt = `Question: "${lastQuestion}"
Student's Answer: "${lastAnswer}"

Provide a concise explanation in this format:
"The correct answer is [ANSWER]. Your answer ([STUDENT_ANSWER]) is incorrect because [BRIEF REASON]."

Keep it educational but under 40 words:`;

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

        // Keep same difficulty or decrease slightly
        updatedDifficulty = Math.max(1, updatedDifficulty);
      }
    }

    // Build prompt for next question
    const isCorrectAnswer =
      answerFeedback && answerFeedback.result === "Correct";
    const quizPrompt = buildQuizPrompt(
      updatedDifficulty,
      lastQuestion,
      lastAnswer,
      isCorrectAnswer
    );
    const quizResponse = await bedrockClient.queryBedrock(quizPrompt);

    const finalResponse = {
      nextQuestion: quizResponse.response,
      score: updatedScore,
      difficulty: updatedDifficulty,
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

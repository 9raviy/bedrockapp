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
      
      // Ask Bedrock to check the answer
      const checkPrompt = `Question: ${lastQuestion}\nUser's Answer: ${lastAnswer}\n\nPlease respond with exactly "CORRECT" if the answer is right, or "INCORRECT" if the answer is wrong. Do not include any other text in your response.`;
      const checkResponse = await bedrockClient.queryBedrock(checkPrompt);
      console.log("Answer check response:", checkResponse);
      
      const responseText = (checkResponse.response || "").trim().toUpperCase();
      // More robust answer checking - look for "CORRECT" anywhere in the response
      const isCorrect = responseText.includes("CORRECT") || 
                       responseText.includes("TRUE") || 
                       responseText.includes("RIGHT");
      
      console.log("Response text:", responseText);
      console.log("Is answer correct?", isCorrect);

      if (isCorrect) {
        answerFeedback = {
          result: "Correct",
          explanation: "Well done! That's the correct answer."
        };
        updatedScore += 1;
        updatedDifficulty += 1; // Increase difficulty
        console.log("Answer was correct, updated score:", updatedScore);
      } else {
        console.log("Answer was incorrect, getting explanation...");
        // Get explanation for incorrect answer
        const explanationPrompt = `Question: ${lastQuestion}\nUser's Answer: ${lastAnswer}\nThis answer is incorrect. Please provide a brief explanation of why it's wrong and what the correct answer should be. Keep it concise and educational.`;
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
        
        // Optionally decrease difficulty or keep the same
        updatedDifficulty = Math.max(1, updatedDifficulty - 1);
      }
    }

    // Build prompt for next question
    const isCorrectAnswer = answerFeedback && answerFeedback.result === "Correct";
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
    
    console.log("Final response being sent:", JSON.stringify(finalResponse, null, 2));

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

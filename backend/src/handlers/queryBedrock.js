const bedrockClient = require("../utils/bedrockClient");

// Helper to build prompt for Bedrock - Updated for Multiple Choice
function buildQuizPrompt(difficulty, lastQuestion, lastAnswer, wasCorrect) {
  if (!lastQuestion) {
    // First question
    return `Generate a multiple choice quiz question for a user. The difficulty level is ${difficulty}.

Format your response as a JSON object with this exact structure:
{
  "question": "Your question here?",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "A"
}

Requirements:
- Create 4 options (A, B, C, D)
- Only 1 option should be correct
- Make the incorrect options plausible but clearly wrong
- Difficulty level ${difficulty} (1=easy, 10=very hard)
- Return ONLY the JSON object, no other text`;
  } else if (wasCorrect) {
    return `The user answered the previous question correctly. Generate a new multiple choice quiz question with increased difficulty level ${difficulty}.

Format your response as a JSON object with this exact structure:
{
  "question": "Your question here?",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "A"
}

Requirements:
- Create 4 options (A, B, C, D)
- Only 1 option should be correct
- Make it more challenging than basic questions
- Difficulty level ${difficulty} (1=easy, 10=very hard)
- Return ONLY the JSON object, no other text`;
  } else {
    return `The user answered the previous question incorrectly. Generate a new multiple choice quiz question at the same difficulty level ${difficulty}.

Format your response as a JSON object with this exact structure:
{
  "question": "Your question here?",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "A"
}

Requirements:
- Create 4 options (A, B, C, D)
- Only 1 option should be correct
- Keep similar difficulty level
- Difficulty level ${difficulty} (1=easy, 10=very hard)
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
      lastAnswer = null, // This will now be "A", "B", "C", or "D"
      lastCorrectAnswer = null, // We'll need this to check answers
      score = 0,
      difficulty = 1,
      wasCorrect = null,
    } = requestBody || event;

    // If there was a previous question, check the answer
    let updatedScore = score;
    let updatedDifficulty = difficulty;
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
        updatedDifficulty = Math.min(10, updatedDifficulty + 1); // Cap at difficulty 10
        console.log("Answer was correct, updated score:", updatedScore);
      } else {
        console.log("Answer was incorrect, getting explanation...");

        // ✅ IMPROVED: Explanation prompt for multiple choice
        const explanationPrompt = `A student answered a multiple choice question incorrectly.

Question: "${lastQuestion}"
Student's Answer: "${lastAnswer}"
Correct Answer: "${lastCorrectAnswer}"

Provide a concise explanation in this format:
"The correct answer is ${lastCorrectAnswer}. Your choice ${lastAnswer} is incorrect because [BRIEF REASON]. [ONE EDUCATIONAL FACT about the correct answer]."

Keep it educational but under 50 words:`;

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

      // Fallback to a simple question format
      questionData = {
        question: quizResponse.response || "What is 2 + 2?",
        options: ["A) 3", "B) 4", "C) 5", "D) 6"],
        correctAnswer: "B",
      };
    }

    const finalResponse = {
      nextQuestion: questionData.question,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
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

import React, { useState, useEffect } from "react";
import { getNextQuestion } from "./api";

const initialState = {
  lastQuestion: null,
  lastAnswer: null,
  lastCorrectAnswer: null,
  score: 0,
  difficulty: 1,
  wasCorrect: null,
};

function Quiz() {
  const [state, setState] = useState(initialState);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch first question on mount
  useEffect(() => {
    fetchQuestion(initialState);
    // eslint-disable-next-line
  }, []);

  async function fetchQuestion(payload) {
    setLoading(true);
    try {
      const res = await getNextQuestion(payload);
      console.log("API response:", res);
      console.log("Feedback type:", typeof res.feedback);
      console.log("Feedback value:", res.feedback);
      console.log(
        "Feedback stringified:",
        JSON.stringify(res.feedback, null, 2)
      );

      setQuestion(res.nextQuestion);
      setOptions(res.options || []);
      setCorrectAnswer(res.correctAnswer || "");
      setFeedback(res.feedback || "");
      setState({
        ...payload,
        lastQuestion: res.nextQuestion,
        lastCorrectAnswer: res.correctAnswer,
        score: res.score,
        difficulty: res.difficulty,
        wasCorrect:
          // Fixed: Only check for object feedback with result "Correct"
          typeof res.feedback === "object" &&
          res.feedback &&
          res.feedback.result === "Correct",
      });
      setSelectedAnswer("");
    } catch (error) {
      console.error("Error fetching question:", error);
      setFeedback({
        result: "Error",
        explanation: "Failed to load question. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedAnswer && question) {
      return; // Don't submit if no answer selected
    }

    await fetchQuestion({
      ...state,
      lastAnswer: selectedAnswer,
    });
  }

  function handleOptionSelect(option) {
    // Extract the letter (A, B, C, D) from the option like "A) Yellow"
    const letter = option.charAt(0);
    setSelectedAnswer(letter);
  }

  return (
    <div className="quiz-container">
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-label">Score</div>
          <div className="stat-value">{state.score}</div>
        </div>
        <div className="stat-card difficulty-card">
          <div className="stat-label">Difficulty</div>
          <div className="stat-value">{state.difficulty}</div>
        </div>
      </div>

      <div className="question">
        {question || "Welcome! Click submit to get your first question."}
      </div>

      {/* Multiple Choice Options */}
      {options.length > 0 && (
        <div className="options-container">
          {options.map((option, index) => (
            <button
              key={index}
              className={`option-btn ${
                selectedAnswer === option.charAt(0) ? "selected" : ""
              }`}
              onClick={() => handleOptionSelect(option)}
              disabled={loading}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="answer-form">
        <div className="input-container">
          <button
            type="submit"
            disabled={loading || (!selectedAnswer && question)}
            className="submit-btn"
          >
            {loading ? "Loading..." : question ? "Submit Answer" : "Start Quiz"}
          </button>
        </div>
      </form>

      {feedback && (
        <div
          className={`feedback ${
            // Fixed: Check for object feedback with result "Correct"
            typeof feedback === "object" &&
            feedback &&
            feedback.result === "Correct"
              ? "correct"
              : "incorrect"
          }`}
        >
          {typeof feedback === "string" ? (
            feedback
          ) : feedback && typeof feedback === "object" ? (
            <div>
              <div className="feedback-result">
                {feedback.result || "Error"}
              </div>
              {feedback.explanation && (
                <div className="feedback-explanation">
                  {feedback.explanation}
                </div>
              )}
            </div>
          ) : (
            "No feedback available"
          )}
        </div>
      )}

      {loading && <div className="loading">Getting your next question</div>}
    </div>
  );
}

export default Quiz;

import React, { useState, useEffect } from "react";
import { getNextQuestion } from "./api";

const initialState = {
  lastQuestion: null,
  lastAnswer: null,
  score: 0,
  difficulty: 1,
  wasCorrect: null,
};

function Quiz() {
  const [state, setState] = useState(initialState);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
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
      console.log("API response:", res); // Debug logging
      console.log("Feedback type:", typeof res.feedback);
      console.log("Feedback value:", res.feedback);
      console.log("Feedback stringified:", JSON.stringify(res.feedback, null, 2));
      
      setQuestion(res.nextQuestion);
      setFeedback(res.feedback || "");
      setState({
        ...payload,
        lastQuestion: res.nextQuestion,
        score: res.score,
        difficulty: res.difficulty,
        wasCorrect:
          res.feedback === "Correct!" ||
          (typeof res.feedback === "object" &&
            res.feedback &&
            res.feedback.result === "Correct"),
      });
      setAnswer("");
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
    await fetchQuestion({
      ...state,
      lastAnswer: answer,
    });
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

      <form onSubmit={handleSubmit} className="answer-form">
        <div className="input-container">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer here..."
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading || (!answer && question)}
            className="submit-btn"
          >
            {loading ? "Loading..." : question ? "Submit" : "Start Quiz"}
          </button>
        </div>
      </form>

      {feedback && (
        <div
          className={`feedback ${
            feedback === "Correct!" ||
            (typeof feedback === "object" &&
              feedback &&
              feedback.result === "Correct")
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

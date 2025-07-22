import React, { useState, useEffect } from "react";
import { getNextQuestion } from "./api";

const initialState = {
  lastQuestion: null,
  lastAnswer: null,
  lastCorrectAnswer: null,
  score: 0,
  questionNumber: 1,
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
  const [quizComplete, setQuizComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [progress, setProgress] = useState(0);

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

      // Check if quiz is complete
      if (res.quizComplete) {
        setQuizComplete(true);
        setFinalScore(res);
        setFeedback(res.feedback || "");
        setLoading(false);
        return;
      }

      setQuestion(res.nextQuestion);
      setOptions(res.options || []);
      setCorrectAnswer(res.correctAnswer || "");
      setFeedback(res.feedback || "");
      setProgress(res.progress || 0);
      setState({
        ...payload,
        lastQuestion: res.nextQuestion,
        lastCorrectAnswer: res.correctAnswer,
        score: res.score,
        questionNumber: res.questionNumber,
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

  function restartQuiz() {
    setQuizComplete(false);
    setFinalScore(null);
    setState(initialState);
    setQuestion("");
    setOptions([]);
    setCorrectAnswer("");
    setSelectedAnswer("");
    setFeedback("");
    setProgress(0);
    fetchQuestion(initialState);
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h1>AWS AI Practitioner Practice Exam</h1>
        <p>Test your knowledge of AWS AI/ML services and best practices</p>
      </div>

      {quizComplete ? (
        // Quiz completion screen
        <div className="quiz-complete">
          <div className="completion-card">
            <h2>🎉 Quiz Complete!</h2>
            <div className="final-stats">
              <div className="final-score">
                <span className="score-number">{finalScore.finalScore}/10</span>
                <span className="score-percentage">({finalScore.percentage}%)</span>
              </div>
              <div className="pass-status">
                <span className={`status ${finalScore.percentage >= 70 ? 'passed' : 'failed'}`}>
                  {finalScore.percentage >= 70 ? 'PASSED' : 'FAILED'}
                </span>
                <p>{finalScore.message}</p>
              </div>
            </div>
            {feedback && (
              <div className="final-feedback">
                <div className="feedback-explanation">
                  {feedback.explanation}
                </div>
              </div>
            )}
            <button onClick={restartQuiz} className="restart-btn">
              Take Quiz Again
            </button>
          </div>
        </div>
      ) : (
        // Active quiz screen
        <>
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="progress-text">
              Question {state.questionNumber}/10 ({progress}%)
            </div>
          </div>

          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-label">Score</div>
              <div className="stat-value">{state.score}/10</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Progress</div>
              <div className="stat-value">{state.questionNumber}/10</div>
            </div>
          </div>

          <div className="question">
            {question || "Welcome! Click 'Start Quiz' to begin your AWS AI Practitioner practice exam."}
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

          {loading && <div className="loading">Getting your next question...</div>}
        </>
      )}
    </div>
  );
}

export default Quiz;

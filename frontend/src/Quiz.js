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

function Quiz({ quizType = 'ai-practitioner' }) {
  const [state, setState] = useState({
    ...initialState,
    quizType: quizType
  });
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [quizComplete, setQuizComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [answeredCorrectly, setAnsweredCorrectly] = useState(null);
  const [nextQuestionData, setNextQuestionData] = useState(null);

  // Fetch first question on mount or when quiz type changes
  useEffect(() => {
    fetchQuestion({
      ...initialState,
      quizType: quizType
    });
    // eslint-disable-next-line
  }, [quizType]);

  async function fetchQuestion(payload) {
    setLoading(true);
    setLoadingMessage("Getting your next question...");
    
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
      const errorMessage = error.message.includes('Failed to fetch') 
        ? "Connection issue detected. Please check your internet connection and try again."
        : error.message.includes('timeout')
        ? "Request timed out. The AI service may be busy - please try again."
        : "Failed to load question. Please try again.";
        
      setFeedback({
        result: "Error",
        explanation: errorMessage,
      });
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedAnswer && question) {
      return; // Don't submit if no answer selected
    }

    // Get feedback and next question from the API
    setLoading(true);
    setLoadingMessage("Checking your answer...");
    
    try {
      const res = await getNextQuestion({
        ...state,
        lastAnswer: selectedAnswer,
      });
      
      console.log("API response:", res);

      // Check if quiz is complete
      if (res.quizComplete) {
        setQuizComplete(true);
        setFinalScore(res);
        setFeedback(res.feedback || "");
        setLoading(false);
        return;
      }

      // Show feedback and determine if answer was correct
      setFeedback(res.feedback || "");
      const isCorrect = typeof res.feedback === "object" &&
        res.feedback &&
        res.feedback.result === "Correct";
      
      setAnsweredCorrectly(isCorrect);
      setShowingFeedback(true);
      
      // Store the next question data but don't display it yet
      setNextQuestionData({
        question: res.nextQuestion,
        options: res.options || [],
        correctAnswer: res.correctAnswer || "",
        progress: res.progress || 0,
      });
      
      // Update state with the response data
      setState({
        ...state,
        lastAnswer: selectedAnswer,
        lastQuestion: question,
        lastCorrectAnswer: correctAnswer,
        score: res.score,
        questionNumber: res.questionNumber,
        wasCorrect: isCorrect,
      });
      
      // If answer was correct, automatically proceed to next question after a brief delay
      if (isCorrect) {
        setTimeout(() => {
          proceedToNextQuestion();
        }, 2000); // 2 second delay to show correct feedback
      }
      // If incorrect, wait for user to click "Continue"
      
    } catch (error) {
      console.error("Error fetching question:", error);
      const errorMessage = error.message.includes('Failed to fetch') 
        ? "Connection issue detected. Please check your internet connection and try again."
        : error.message.includes('timeout')
        ? "Request timed out. The AI service may be busy - please try again."
        : "Failed to load question. Please try again.";
        
      setFeedback({
        result: "Error",
        explanation: errorMessage,
      });
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }

  function proceedToNextQuestion() {
    // Load the next question from stored data
    if (nextQuestionData) {
      setQuestion(nextQuestionData.question);
      setOptions(nextQuestionData.options);
      setCorrectAnswer(nextQuestionData.correctAnswer);
      setProgress(nextQuestionData.progress);
      setSelectedAnswer("");
      setShowingFeedback(false);
      setAnsweredCorrectly(null);
      setNextQuestionData(null);
    }
  }

  function handleContinue() {
    proceedToNextQuestion();
  }

  function handleOptionSelect(option) {
    // Extract the letter (A, B, C, D) from the option like "A) Yellow"
    const letter = option.charAt(0);
    setSelectedAnswer(letter);
  }

  function restartQuiz() {
    const newInitialState = {
      ...initialState,
      quizType: quizType
    };
    setQuizComplete(false);
    setFinalScore(null);
    setState(newInitialState);
    setQuestion("");
    setOptions([]);
    setCorrectAnswer("");
    setSelectedAnswer("");
    setFeedback("");
    setProgress(0);
    setShowingFeedback(false);
    setAnsweredCorrectly(null);
    setNextQuestionData(null);
    fetchQuestion(newInitialState);
  }

  return (
    <div className="quiz-container">
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
        // Active quiz screen with split layout
        <>
          {/* Main Content Area */}
          <div className="quiz-main">
            <div className="quiz-header">
              <h1>AWS AI Practitioner Practice Exam</h1>
              <p>Test your knowledge of AWS AI/ML services and best practices</p>
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
                    } ${
                      showingFeedback && option.charAt(0) === correctAnswer ? "correct-answer" : ""
                    } ${
                      showingFeedback && selectedAnswer === option.charAt(0) && answeredCorrectly === false ? "incorrect-answer" : ""
                    }`}
                    onClick={() => handleOptionSelect(option)}
                    disabled={loading || showingFeedback}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="answer-form">
              <div className="input-container">
                {showingFeedback && answeredCorrectly === false ? (
                  // Show Continue button for incorrect answers
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={loading}
                    className="submit-btn continue-btn"
                  >
                    {loading ? "Loading..." : "Continue to Next Question"}
                  </button>
                ) : showingFeedback && answeredCorrectly === true ? (
                  // Show auto-advancing message for correct answers
                  <div className="auto-advance-message">
                    ✅ Correct! Moving to next question...
                  </div>
                ) : (
                  // Show Submit Answer button for unanswered questions
                  <button
                    type="submit"
                    disabled={loading || (!selectedAnswer && question)}
                    className="submit-btn"
                  >
                    {loading ? "Loading..." : question ? "Submit Answer" : "Start Quiz"}
                  </button>
                )}
              </div>
            </form>

            {loading && <div className="loading">{loadingMessage}</div>}
          </div>

          {/* Sidebar Area */}
          <div className="quiz-sidebar">
            {/* Progress Section */}
            <div className="progress-container">
              <h3>Quiz Progress</h3>
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

            {/* Stats Section */}
            <div className="stats-container">
              <div className="stat-card">
                <div className="stat-label">Current Score</div>
                <div className="stat-value">{state.score}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Questions Answered</div>
                <div className="stat-value">{state.questionNumber - 1}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Remaining</div>
                <div className="stat-value">{10 - (state.questionNumber - 1)}</div>
              </div>
            </div>

            {/* Feedback Section */}
            {feedback && (
              <div
                className={`sidebar-feedback ${
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
          </div>
        </>
      )}
    </div>
  );
}

export default Quiz;

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
    const res = await getNextQuestion(payload);
    setQuestion(res.nextQuestion);
    setFeedback(res.feedback || "");
    setState({
      ...payload,
      lastQuestion: res.nextQuestion,
      score: res.score,
      difficulty: res.difficulty,
      wasCorrect: res.feedback === "Correct!",
    });
    setAnswer("");
    setLoading(false);
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
      <div className="score">Score: {state.score}</div>
      <div className="difficulty">Difficulty: {state.difficulty}</div>
      <div className="question">{question}</div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer"
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading || !answer}>
          Submit
        </button>
      </form>
      {feedback && <div className="feedback">{feedback}</div>}
      {loading && <div className="loading">Loading...</div>}
    </div>
  );
}

export default Quiz;

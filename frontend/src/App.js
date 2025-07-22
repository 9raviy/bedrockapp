import React, { useState } from "react";
import Quiz from "./Quiz";
import QuizSelector from "./QuizSelector";

function App() {
  const [selectedQuizType, setSelectedQuizType] = useState(null);
  const [quizTitle, setQuizTitle] = useState("");

  const handleQuizTypeSelect = (quizType) => {
    setSelectedQuizType(quizType);
    const titles = {
      'ai-practitioner': '🤖 AWS AI Practitioner Quiz',
      'solutions-architect': '🏗️ AWS Solutions Architect Associate Quiz'
    };
    setQuizTitle(titles[quizType] || '☁️ AWS Certification Quiz');
  };

  const handleBackToSelector = () => {
    setSelectedQuizType(null);
    setQuizTitle("");
  };

  return (
    <div className="app-container">
      {!selectedQuizType ? (
        <QuizSelector onQuizTypeSelect={handleQuizTypeSelect} />
      ) : (
        <>
          <div className="quiz-header-with-back">
            <button className="back-btn" onClick={handleBackToSelector}>
              ← Back to Quiz Selection
            </button>
            <h1>{quizTitle}</h1>
          </div>
          <Quiz quizType={selectedQuizType} />
        </>
      )}
    </div>
  );
}

export default App;

import React from 'react';

function QuizSelector({ onQuizTypeSelect }) {
  const quizTypes = [
    {
      id: 'ai-practitioner',
      title: 'AWS AI Practitioner',
      description: 'Test your knowledge of AWS AI/ML services, responsible AI practices, and AI governance.',
      services: ['Amazon Bedrock', 'SageMaker', 'Comprehend', 'Rekognition', 'Lex', 'Textract'],
      difficulty: 'Beginner to Intermediate',
      passingScore: '70%',
      icon: '🤖'
    },
    {
      id: 'solutions-architect',
      title: 'AWS Solutions Architect Associate',
      description: 'Test your knowledge of AWS core services, architectural best practices, and cloud solutions.',
      services: ['EC2', 'S3', 'VPC', 'RDS', 'Lambda', 'CloudFormation'],
      difficulty: 'Intermediate',
      passingScore: '72%',
      icon: '🏗️'
    }
  ];

  return (
    <div className="quiz-selector">
      <div className="selector-header">
        <h1>Choose Your AWS Certification Quiz</h1>
        <p>Select the certification exam you'd like to practice for</p>
      </div>
      
      <div className="quiz-options">
        {quizTypes.map((quiz) => (
          <div 
            key={quiz.id} 
            className="quiz-option-card"
            onClick={() => onQuizTypeSelect(quiz.id)}
          >
            <div className="quiz-icon">{quiz.icon}</div>
            <h2>{quiz.title}</h2>
            <p className="quiz-description">{quiz.description}</p>
            
            <div className="quiz-details">
              <div className="detail-item">
                <strong>Key Services:</strong>
                <ul>
                  {quiz.services.map((service, index) => (
                    <li key={index}>{service}</li>
                  ))}
                </ul>
              </div>
              
              <div className="quiz-meta">
                <div className="meta-item">
                  <span className="meta-label">Difficulty:</span>
                  <span className="meta-value">{quiz.difficulty}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Passing Score:</span>
                  <span className="meta-value">{quiz.passingScore}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Questions:</span>
                  <span className="meta-value">10</span>
                </div>
              </div>
            </div>
            
            <button className="start-quiz-btn">
              Start {quiz.title} Quiz
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuizSelector;

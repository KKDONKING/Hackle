import { useState, useEffect } from "react";
import "./QuizComponent.css";

const QuizComponent = ({ quiz, onQuit }) => {
  // Handle case when no quiz is available
  if (!quiz) {
    return (
      <div className="quiz-container">
        <h2>No Quiz Available</h2>
        <button onClick={() => onQuit(null)}>Go Back</button>
      </div>
    );
  }
  
  // Handle case when quiz is already completed
  if (quiz.alreadyCompleted) {
    return (
      <div className="quiz-container">
        <h2>Quiz Already Completed</h2>
        <p>{quiz.message || "You've already completed today's quiz. Come back tomorrow!"}</p>
        <button onClick={() => onQuit(null)}>Back to Dashboard</button>
      </div>
    );
  }
  
  // Handle case when there's an error
  if (quiz.error) {
    return (
      <div className="quiz-container">
        <h2>Quiz Error</h2>
        <p>{quiz.error}</p>
        <button onClick={() => onQuit(null)}>Back to Dashboard</button>
      </div>
    );
  }

  // Filter out invalid questions
  const validQuestions = quiz.questions?.filter(q => typeof q === "object" && q.question) || [];
  
  if (validQuestions.length === 0) {
    return (
      <div className="quiz-container">
        <h2>Invalid Quiz</h2>
        <p>This quiz doesn't have any valid questions.</p>
        <button onClick={() => onQuit(null)}>Back to Dashboard</button>
      </div>
    );
  }

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleOptionClick = (selectedOption) => {
    if (submitted) return; // Prevent changing answer after submission
    setSelectedOption(selectedOption);
  };

  const handleNextQuestion = () => {
    // Check if the answer is correct and update score
    if (validQuestions[currentQuestionIndex]?.correctAnswer === selectedOption) {
      setScore(prevScore => prevScore + 1);
    }
    
    // Reset selected option and submission state
    setSelectedOption(null);
    setSubmitted(false);
    
    // Move to next question or complete quiz
    if (currentQuestionIndex < validQuestions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setQuizCompleted(true);
    }
  };
  
  const handleSubmitAnswer = () => {
    if (!selectedOption || submitted) return;
    setSubmitted(true);
  };
  
  const handleQuit = () => {
    // Only pass score if quiz was completed
    onQuit(quizCompleted ? score : null);
  };

  // Render quiz completion screen
  if (quizCompleted) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h2>Quiz Completed!</h2>
        </div>
        <div className="completion-screen">
          <h3>Your Score: {score} / {validQuestions.length}</h3>
          <p>You got {score} out of {validQuestions.length} questions correct.</p>
          <p>Your score has been added to your profile!</p>
          <button onClick={handleQuit} className="back-button">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // Get current question
  const currentQuestion = validQuestions[currentQuestionIndex];

  // Render current question
  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>{quiz.title || "Daily Quiz"}</h2>
        <button onClick={handleQuit} className="quit-btn">Exit Quiz</button>
      </div>
      
      <div className="question-counter">
        Question {currentQuestionIndex + 1} of {validQuestions.length}
      </div>
      
      <div className="question">
        <h3>{currentQuestion.question}</h3>
      </div>
      
      <div className="options">
        {currentQuestion.options.map((option, index) => (
          <div 
            key={index} 
            className={`option ${selectedOption === option ? 'selected' : ''} ${
              submitted ? (
                option === currentQuestion.correctAnswer ? 'correct' : 
                selectedOption === option ? 'incorrect' : ''
              ) : ''
            }`}
            onClick={() => handleOptionClick(option)}
          >
            {option}
          </div>
        ))}
      </div>
      
      <div className="controls">
        {!submitted ? (
          <button 
            onClick={handleSubmitAnswer} 
            disabled={!selectedOption}
            className="submit-button"
          >
            Submit Answer
          </button>
        ) : (
          <button 
            onClick={handleNextQuestion} 
            className="next-button"
          >
            {currentQuestionIndex < validQuestions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizComponent;

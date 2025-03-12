import { useState, useEffect } from "react";
import "./QuizComponent.css";

const QuizComponent = ({ quiz, onQuit }) => {
  // Handle case when no quiz is available
  if (!quiz) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h2>No Quiz Available</h2>
        </div>
        <div className="empty-state">
          <p>There are no quizzes available at the moment.</p>
          <button onClick={() => onQuit(null)} className="back-button">Go Back</button>
        </div>
      </div>
    );
  }
  
  // Handle case when quiz is already completed
  if (quiz.alreadyCompleted) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h2>Quiz Already Completed</h2>
        </div>
        <div className="completion-screen">
          <p>{quiz.message || "You've already completed today's quiz. Come back tomorrow!"}</p>
          <button onClick={() => onQuit(null)} className="back-button">Back to Dashboard</button>
        </div>
      </div>
    );
  }
  
  // Handle case when there's an error
  if (quiz.error) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h2>Quiz Error</h2>
        </div>
        <div className="error-state">
          <p>{quiz.error}</p>
          <button onClick={() => onQuit(null)} className="back-button">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // Filter out invalid questions
  const validQuestions = quiz.questions?.filter(q => typeof q === "object" && q.question) || [];
  
  if (validQuestions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h2>Invalid Quiz</h2>
        </div>
        <div className="error-state">
          <p>This quiz doesn't have any valid questions.</p>
          <button onClick={() => onQuit(null)} className="back-button">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Reset state when quiz changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizCompleted(false);
    setSelectedOption(null);
    setSubmitted(false);
    setIsAnimating(false);
  }, [quiz.id]);

  const handleOptionClick = (selectedOption) => {
    if (submitted) return; // Prevent changing answer after submission
    setSelectedOption(selectedOption);
  };

  const handleNextQuestion = () => {
    // Start transition animation
    setIsAnimating(true);
    
    // Check if the answer is correct and update score
    if (validQuestions[currentQuestionIndex]?.correctAnswer === selectedOption) {
      setScore(prevScore => prevScore + 1);
    }
    
    // Short delay for animation
    setTimeout(() => {
      // Reset selected option and submission state
      setSelectedOption(null);
      setSubmitted(false);
      
      // Move to next question or complete quiz
      if (currentQuestionIndex < validQuestions.length - 1) {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      } else {
        setQuizCompleted(true);
      }
      
      // End animation after state updates
      setIsAnimating(false);
    }, 300);
  };
  
  const handleSubmitAnswer = () => {
    if (!selectedOption || submitted) return;
    setSubmitted(true);
  };
  
  const handleQuit = () => {
    // Only pass score if quiz was completed
    onQuit(quizCompleted ? score : null);
  };

  // Calculate progress percentage
  const progressPercentage = ((currentQuestionIndex + 1) / validQuestions.length) * 100;

  // Render quiz completion screen
  if (quizCompleted) {
    // Calculate percentage score
    const percentScore = Math.round((score / validQuestions.length) * 100);
    let resultMessage = "";
    
    if (percentScore >= 90) {
      resultMessage = "Outstanding! You're a quiz master!";
    } else if (percentScore >= 70) {
      resultMessage = "Great job! You know your stuff!";
    } else if (percentScore >= 50) {
      resultMessage = "Good effort! Keep learning!";
    } else {
      resultMessage = "Keep practicing! You'll improve next time!";
    }
    
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h2>Quiz Completed!</h2>
        </div>
        <div className="completion-screen">
          <div 
            className="score-circle"
            style={{ "--final-score-percent": `${percentScore}%` }}
          >
            <span className="score-percentage">{percentScore}%</span>
          </div>
          <h3>Your Score: {score} / {validQuestions.length}</h3>
          <p className="result-message">{resultMessage}</p>
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
      
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="question-counter">
          Question {currentQuestionIndex + 1} of {validQuestions.length}
        </div>
      </div>
      
      <div className={`question ${isAnimating ? 'fade-out' : 'fade-in'}`}>
        <h3>{currentQuestion.question}</h3>
      </div>
      
      <div className={`options ${isAnimating ? 'fade-out' : 'fade-in'}`}>
        {currentQuestion.options.map((option, index) => (
          <div 
            key={index} 
            className={`option ${selectedOption === option ? 'selected' : ''} ${
              submitted ? (
                option === currentQuestion.correctAnswer ? 'correct' : 
                selectedOption === option && selectedOption !== currentQuestion.correctAnswer ? 'incorrect' : ''
              ) : ''
            }`}
            onClick={() => handleOptionClick(option)}
          >
            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
            <span className="option-text">{option}</span>
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

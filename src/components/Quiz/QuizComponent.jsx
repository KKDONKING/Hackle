import { useState } from "react";
import "./QuizComponent.css";

const QuizComponent = ({ quiz, onQuit }) => {
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="quiz-container">
        <h2>No Quiz Available</h2>
        <button onClick={onQuit}>Go Back</button>
      </div>
    );
  }

  console.log("✅ Loaded Quiz:", quiz);

  // Filter out invalid questions
  const validQuestions = quiz.questions.filter(q => typeof q === "object" && q.question);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const handleOptionClick = (selectedOption) => {
    if (validQuestions[currentQuestionIndex]?.correctAnswer === selectedOption) {
      setScore((prevScore) => prevScore + 1);
    }

    if (currentQuestionIndex === validQuestions.length - 1) {
      setQuizCompleted(true);
    } else {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    }
  };

  if (quizCompleted) {
    return (
      <div className="quiz-container">
        <h2>Quiz Completed!</h2>
        <p>Your Score: {score} / {validQuestions.length}</p>
        <button className="retry-btn" onClick={onQuit}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestion = validQuestions[currentQuestionIndex];

  return (
    <div className="quiz-container">
      <h2>{quiz.title}</h2>
      {currentQuestion ? (
        <div className="question-box">
          <h3>Q{currentQuestionIndex + 1}: {currentQuestion.question}</h3>
          <div className="options-grid">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                className="option-button"
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p>No more questions available.</p>
      )}
    </div>
  );
};

export default QuizComponent;

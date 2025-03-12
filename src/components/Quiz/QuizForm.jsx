import { useState } from "react";
import { addQuizToFirebase } from "../../services/QuizService";
import "./QuizComponent.css";

const QuizForm = ({ onQuizAdded, onCancel }) => {
  const [quiz, setQuiz] = useState({
    title: "",
    description: "",
    difficulty: "medium",
    category: "general",
    questions: [
      {
        question: "",
        options: ["", "", "", ""],
        correctAnswer: "",
      },
    ],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleQuizPropertyChange = (e) => {
    const { name, value } = e.target;
    setQuiz({ ...quiz, [name]: value });
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...quiz.questions];
    const updatedOptions = [...updatedQuestions[questionIndex].options];
    updatedOptions[optionIndex] = value;
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options: updatedOptions,
    };
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const handleCorrectAnswerChange = (questionIndex, value) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      correctAnswer: value,
    };
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const addQuestion = () => {
    setQuiz({
      ...quiz,
      questions: [
        ...quiz.questions,
        {
          question: "",
          options: ["", "", "", ""],
          correctAnswer: "",
        },
      ],
    });
  };

  const removeQuestion = (index) => {
    if (quiz.questions.length <= 1) {
      setError("Quiz must have at least one question");
      return;
    }
    
    const updatedQuestions = [...quiz.questions];
    updatedQuestions.splice(index, 1);
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Validate form data
      if (!quiz.title.trim()) {
        throw new Error("Quiz title is required");
      }
      
      // Check if all questions are filled out
      quiz.questions.forEach((q, i) => {
        if (!q.question.trim()) {
          throw new Error(`Question ${i + 1} text is required`);
        }
        
        if (q.options.some(opt => !opt.trim())) {
          throw new Error(`All options for question ${i + 1} must be filled out`);
        }
        
        if (!q.correctAnswer.trim()) {
          throw new Error(`Correct answer for question ${i + 1} is required`);
        }
        
        if (!q.options.includes(q.correctAnswer)) {
          throw new Error(`Correct answer for question ${i + 1} must be one of the options`);
        }
      });
      
      // Submit to Firebase
      const quizId = await addQuizToFirebase(quiz);
      setSuccess(true);
      if (onQuizAdded) onQuizAdded(quizId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="quiz-container">
        <div className="completion-screen">
          <h3>Quiz Added Successfully!</h3>
          <p>Your quiz has been added to the database and is now available for users.</p>
          <button className="back-button" onClick={() => onQuizAdded()}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-form-container">
      <h2>Create New Quiz</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Quiz Title*</label>
          <input
            type="text"
            id="title"
            name="title"
            value={quiz.title}
            onChange={handleQuizPropertyChange}
            placeholder="Enter a descriptive title for your quiz"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={quiz.description}
            onChange={handleQuizPropertyChange}
            placeholder="Provide a brief description of what this quiz is about"
            rows="3"
          ></textarea>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="difficulty">Difficulty</label>
            <select
              id="difficulty"
              name="difficulty"
              value={quiz.difficulty}
              onChange={handleQuizPropertyChange}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={quiz.category}
              onChange={handleQuizPropertyChange}
            >
              <option value="general">General</option>
              <option value="programming">Programming</option>
              <option value="science">Science</option>
              <option value="mathematics">Mathematics</option>
              <option value="history">History</option>
            </select>
          </div>
        </div>
        
        <div className="questions-section">
          <div className="section-header">
            <h3>Questions</h3>
            <span className="question-count">{quiz.questions.length} question(s)</span>
          </div>
          
          {quiz.questions.map((question, qIndex) => (
            <div className="question-card" key={qIndex}>
              <div className="question-header">
                <h4>Question {qIndex + 1}</h4>
                <button 
                  type="button" 
                  className="delete-btn"
                  onClick={() => removeQuestion(qIndex)}
                  aria-label="Remove question"
                >
                  ×
                </button>
              </div>
              
              <div className="form-group">
                <label htmlFor={`question-${qIndex}`}>Question Text*</label>
                <input
                  type="text"
                  id={`question-${qIndex}`}
                  value={question.question}
                  onChange={(e) => handleQuestionChange(qIndex, "question", e.target.value)}
                  placeholder="Enter your question here"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Options (click "Set as Correct" to mark the correct answer)</label>
                {question.options.map((option, oIndex) => (
                  <div className="option-row" key={oIndex}>
                    <div className="option-input-container">
                      <span className="option-label" title={`Option ${String.fromCharCode(65 + oIndex)}`}>
                        {String.fromCharCode(65 + oIndex)}
                      </span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        required
                        className="option-input"
                      />
                      <button
                        type="button"
                        className={`correct-answer-btn ${question.correctAnswer === option ? 'is-correct' : ''}`}
                        onClick={() => handleCorrectAnswerChange(qIndex, option)}
                        disabled={!option.trim()}
                      >
                        {question.correctAnswer === option ? (
                          <span className="correct-indicator">Correct Answer</span>
                        ) : (
                          <span>Set as Correct</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <button 
            type="button" 
            className="add-question-btn" 
            onClick={addQuestion}
          >
            + Add Another Question
          </button>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-quiz-btn"
            disabled={loading}
          >
            {loading ? "Creating Quiz..." : "Create Quiz"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizForm; 
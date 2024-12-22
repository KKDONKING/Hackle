import React, { useState, useEffect } from "react";
import { fetchDailyQuizzes, saveQuizProgress } from "../../services/QuizService";
import { useAuth } from "../../firebase/AuthProvider";

const QuizPage = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const dailyQuizzes = await fetchDailyQuizzes(user.uid);
        setQuizzes(dailyQuizzes);
        setCurrentQuiz(dailyQuizzes[0]);
      } catch (err) {
        console.error("Error loading quizzes:", err);
      } finally {
        setLoading(false);
      }
    };
    loadQuizzes();
  }, [user]);

  const handleAnswer = (questionIndex, answer) => {
    setProgress({ ...progress, [questionIndex]: answer });
  };

  const handleSubmit = async () => {
    try {
      await saveQuizProgress(user.uid, currentQuiz.id, progress);
      alert("Quiz submitted successfully!");
    } catch (err) {
      console.error("Error saving quiz progress:", err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Daily Quizzes</h1>
      {currentQuiz ? (
        <div>
          <h2>{currentQuiz.title}</h2>
          {currentQuiz.questions.map((q, index) => (
            <div key={index}>
              <p>{q.question}</p>
              {q.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(index, option)}
                  style={{
                    backgroundColor: progress[index] === option ? "lightblue" : "",
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          ))}
          <button onClick={handleSubmit}>Submit Quiz</button>
        </div>
      ) : (
        <p>No quizzes available for today.</p>
      )}
    </div>
  );
};

export default QuizPage;

import { useEffect, useState } from "react";
import { fetchDailyQuizzes } from "../../utils/quizService"; // Your fetch function

const Dashboard = () => {
  const [quizzes, setQuizzes] = useState([]); // State to store quiz data
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const data = await fetchDailyQuizzes(); // Fetch daily quizzes
        setQuizzes(data); // Update state with quiz data
      } catch (err) {
        setError("Failed to load quizzes. Please try again later.");
      } finally {
        setLoading(false); // Stop the loading state
      }
    };
    loadQuizzes();
  }, []);

  if (loading) {
    return <div className="loading">Loading quizzes...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard">
      <h1>Daily Quizzes</h1>

      {quizzes.length > 0 ? (
        <ul className="quiz-list">
          {quizzes.map((quiz, index) => (
            <li key={index} className="quiz-item">
              <h2>{quiz.title}</h2>
              <p>{quiz.description}</p>
              <button
                onClick={() => {
                  alert(`You selected the quiz: ${quiz.title}`);
                }}
              >
                Take Quiz
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No quizzes available for today. Please check back later!</p>
      )}
    </div>
  );
};

export default Dashboard;

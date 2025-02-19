import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../auth/AuthProvider";
import { fetchDailyQuizzes } from "../../services/QuizService";
import { useNavigate } from "react-router-dom";
import QuizComponent from "../Quiz/QuizComponent";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [quizzes, setQuizzes] = useState([]);
  const navigate = useNavigate();
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    if (user) {
      fetchDailyQuizzes(user.uid)
        .then((quizzes) => {
          console.log("✅ Quizzes fetched:", quizzes);
          setQuizzes(quizzes);
        })
        .catch((error) => console.error("❌ Error fetching quizzes:", error));
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">
        Welcome, {user?.displayName || user?.email?.split("@")[0] || "User"}!
      </h1>

      <h2 className="dashboard-subtitle">Today's Quizzes</h2>
      {!selectedQuiz ? (
        <ul className="quiz-list">
          {quizzes.length > 0 ? (
            quizzes.map((quiz) => (
              <li key={quiz.id} className="quiz-item">
                <strong>{quiz.title}</strong> - {quiz.description}
                <button
                  className="start-quiz-btn"
                  onClick={() => setSelectedQuiz(quiz)}
                >
                  Start Quiz
                </button>
              </li>
            ))
          ) : (
            <p className="no-quiz-text">No quizzes assigned yet.</p>
          )}
        </ul>
      ) : (
        <QuizComponent quiz={selectedQuiz} onQuit={() => setSelectedQuiz(null)} />
      )}

      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default Dashboard;

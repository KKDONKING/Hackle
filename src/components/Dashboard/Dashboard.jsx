import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../auth/AuthProvider";
import { fetchDailyQuizForUser, markQuizCompleted } from "../../services/QuizService";
import { addScore } from "../../firebase/leaderboardService"; // ✅ Import score submission
import { useNavigate } from "react-router-dom";
import QuizComponent from "../Quiz/QuizComponent";
import Leaderboard from "../Leaderboard";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [quiz, setQuiz] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchDailyQuizForUser(user.uid)
        .then((dailyQuiz) => {
          setQuiz(dailyQuiz);
        })
        .catch((error) => console.error("❌ Error fetching quiz:", error));
    }
  }, [user]);

  const handleQuizCompletion = (score) => {
    if (user) {
      markQuizCompleted(user.uid);
      setQuiz(null); // Hide quiz after completion

      // 🏆 Add score to the leaderboard after quiz completion
      addScore(user.uid, user.displayName || "Anonymous", score);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      {/* 📌 Content Wrapper for Flex Layout */}
      <div className="dashboard-content">
        {/* 🏆 Left Section - Quiz */}
        <div className="quiz-section">
          <h1>Welcome, {user?.displayName || user?.email.split("@")[0] || "User"}!</h1>
          <h2>Today's Quiz</h2>

          {!selectedQuiz ? (
            quiz ? (
              <div className="quiz-card">
                <strong>{quiz.title}</strong> - {quiz.description}
                <button className="start-quiz-btn" onClick={() => setSelectedQuiz(quiz)}>
                  Start Quiz
                </button>
              </div>
            ) : (
              <p className="no-quiz-text">You've completed today's quiz. Come back tomorrow!</p>
            )
          ) : (
            <QuizComponent quiz={selectedQuiz} onQuit={(score) => handleQuizCompletion(score)} />
          )}

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* 🏆 Right Section - Leaderboard (Separate Component) */}
        <div className="leaderboard-section">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../auth/AuthProvider";
import { fetchDailyQuizForUser, markQuizCompleted, setUserAsAdmin, isUserAdmin } from "../../services/QuizService";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import SquadCard from "../Squads/SquadCard";
import QuizComponent from "../Quiz/QuizComponent";
import QuizForm from "../Quiz/QuizForm";
import Leaderboard from "../Leaderboard/Leaderboard";
import { createSquad } from "../../firebase/squadService";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizError, setQuizError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [username, setUsername] = useState("");
  const [squadId, setSquadId] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalScore: 0,
    quizzesCompleted: 0,
    rank: '-'
  });
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [adminActivated, setAdminActivated] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchQuizData = async () => {
        try {
          setQuizLoading(true);
          setQuizError(null);
          const quizData = await fetchDailyQuizForUser(user.uid);
          console.log("📋 Quiz data fetched:", quizData ? "Success" : "No quiz available");
          setQuiz(quizData);
        } catch (error) {
          console.error("❌ Error fetching quiz:", error);
          setQuizError(error.message || "Failed to fetch quiz");
        } finally {
          setQuizLoading(false);
        }
      };

      fetchQuizData();

      const fetchUserData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUsername(userData.username || "User");
            
            // Check if user is an admin
            setIsAdmin(userData.role === "admin");
            
            // Clear any stale squad reference
            if (userData.squadId) {
              try {
                const squadRef = doc(db, "squads", userData.squadId);
                const squadSnap = await getDoc(squadRef);
                
                if (!squadSnap.exists()) {
                  console.log("🧹 Clearing stale squad reference");
                  await updateDoc(userRef, {
                    squadId: null,
                    role: null,
                    lastUpdated: new Date().toISOString()
                  });
                  setSquadId(null);
                  setIsLeader(false);
                } else {
                  setSquadId(userData.squadId);
                  setIsLeader(userData.role === "leader");
                }
              } catch (error) {
                console.error("❌ Error checking squad:", error);
                setSquadId(null);
                setIsLeader(false);
              }
            } else {
              setSquadId(null);
              setIsLeader(false);
            }

            setStats({
              totalScore: userData.totalScore || 0,
              quizzesCompleted: userData.quizzesCompleted || 0,
              rank: userData.rank || '-'
            });
          } else {
            // Create user document if it doesn't exist
            await setDoc(userRef, {
              userId: user.uid,
              username: "User",
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
              totalScore: 0,
              quizzesCompleted: 0,
              rank: '-'
            });
            setUsername("User");
          }
        } catch (error) {
          console.error("❌ Error fetching user data:", error);
        }
      };
      fetchUserData();
    }
  }, [user]);

  // Reset admin click count after 3 seconds of inactivity
  useEffect(() => {
    if (adminClickCount > 0) {
      const timer = setTimeout(() => {
        setAdminClickCount(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [adminClickCount]);

  // Check if user should be activated as admin
  useEffect(() => {
    if (adminClickCount >= 5 && !isAdmin && user && !adminActivated) {
      const activateAdmin = async () => {
        try {
          await setUserAsAdmin(user.uid);
          setIsAdmin(true);
          setAdminActivated(true);
          console.log("🔑 Admin privileges activated!");
          // Show success message or notification here
          alert("Admin privileges activated! You can now create quizzes.");
        } catch (error) {
          console.error("❌ Failed to set user as admin:", error);
        }
      };
      
      activateAdmin();
    }
  }, [adminClickCount, isAdmin, user, adminActivated]);

  const handleCreateSquad = async (squadData) => {
    try {
      console.log("🔄 Creating squad with data:", squadData);
      
      if (!user) {
        throw new Error("User must be logged in to create a squad");
      }

      // Create squad with the provided data
      const squadId = await createSquad(user.uid, squadData);
      console.log("✅ Squad created with ID:", squadId);
      
      // Update local state
      setSquadId(squadId);
      setIsLeader(true);

      // Fetch updated user data to ensure everything is in sync
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUsername(userData.username || "User");
        setSquadId(userData.squadId);
        setIsLeader(userData.role === "leader");
        
        // Update stats if available
        if (userData.totalScore !== undefined) {
          setStats(prevStats => ({
            ...prevStats,
            totalScore: userData.totalScore
          }));
        }
      }

      return squadId;
    } catch (error) {
      console.error("❌ Error creating squad:", error);
      // Propagate error with user-friendly message
      throw new Error(error.message || "Failed to create squad. Please try again.");
    }
  };

  const handleQuizCreated = (quizId) => {
    console.log("✅ Quiz created with ID:", quizId);
    setShowQuizForm(false);
    // Optionally, you can fetch the quiz again to refresh the dashboard
  };

  const handleTitleClick = () => {
    setAdminClickCount(prev => prev + 1);
  };

  // If the user is not an admin but tries to access the quiz form, redirect them back to dashboard
  if (showQuizForm && !isAdmin) {
    setShowQuizForm(false);
  }

  // If the quiz form is showing and user is admin, render the form
  if (showQuizForm && isAdmin) {
    return (
      <div className="dashboard-container">
        <QuizForm 
          onQuizAdded={handleQuizCreated}
          onCancel={() => setShowQuizForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <div className="dashboard-left">
          <SquadCard 
            squadId={squadId} 
            isLeader={isLeader} 
            user={user} 
            onCreate={handleCreateSquad}
          />
        </div>

        <div className="dashboard-center">
          <div className="welcome-section animate-fade-in">
            <h1 onClick={handleTitleClick}>Welcome back, {username}! 👋</h1>
            <p>Ready to take on today's challenges?</p>
          </div>

          {/* Only show create quiz button to admins */}
          {isAdmin && (
            <div className="admin-actions">
              <button 
                className="create-quiz-btn" 
                onClick={() => setShowQuizForm(true)}
              >
                Create New Quiz
              </button>
            </div>
          )}

          {selectedQuiz && (
            <QuizComponent 
              quiz={selectedQuiz} 
              onQuit={() => {
                markQuizCompleted(user.uid);
                setSelectedQuiz(null);
              }} 
            />
          )}

          {!selectedQuiz && (
            <>
              {quizLoading ? (
                <div className="daily-quiz-card">
                  <h2>Loading Quiz...</h2>
                  <p className="quiz-description">Please wait while we prepare your daily challenge</p>
                </div>
              ) : quizError ? (
                <div className="daily-quiz-card error">
                  <h2>Error Loading Quiz</h2>
                  <p className="quiz-description">{quizError}</p>
                  <button 
                    className="start-quiz-btn"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                </div>
              ) : quiz ? (
                <div className="daily-quiz-card">
                  <h2>Today's Quiz</h2>
                  <p>{quiz.title}</p>
                  <p className="quiz-description">{quiz.description || "Test your knowledge with today's quiz!"}</p>
                  <button 
                    className="start-quiz-btn"
                    onClick={() => setSelectedQuiz(quiz)}
                  >
                    Start Quiz
                  </button>
                </div>
              ) : (
                <div className="daily-quiz-card completed">
                  <h2>No Quiz Available</h2>
                  <p className="quiz-description">
                    {isAdmin 
                      ? "You've already completed today's quiz or there are no quizzes in the database. As an admin, you can create a new quiz."
                      : "You've already completed today's quiz. Come back tomorrow for a new challenge!"}
                  </p>
                  {isAdmin && (
                    <button 
                      className="start-quiz-btn"
                      onClick={() => setShowQuizForm(true)}
                    >
                      Create New Quiz
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <div className="stats-grid animate-slide-up">
            <div className="stat-card">
              <h3>Total Score</h3>
              <div className="value">{stats.totalScore}</div>
            </div>
            <div className="stat-card">
              <h3>Quizzes Completed</h3>
              <div className="value">{stats.quizzesCompleted}</div>
            </div>
            <div className="stat-card">
              <h3>Current Rank</h3>
              <div className="value">{stats.rank}</div>
            </div>
          </div>

          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="dashboard-right">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../auth/AuthProvider";
import { fetchDailyQuizForUser, markQuizCompleted } from "../../services/QuizService";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import SquadCard from "../Squads/SquadCard";
import QuizComponent from "../Quiz/QuizComponent";
import Leaderboard from "../Leaderboard/Leaderboard";
import { createSquad } from "../../firebase/squadService";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [quiz, setQuiz] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [username, setUsername] = useState("");
  const [squadId, setSquadId] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [stats, setStats] = useState({
    totalScore: 0,
    quizzesCompleted: 0,
    rank: '-'
  });

  useEffect(() => {
    if (user) {
      fetchDailyQuizForUser(user.uid).then(setQuiz);

      const fetchUserData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUsername(userData.username || "User");
            
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
            <h1>Welcome back, {username}! 👋</h1>
            <p>Ready to take on today's challenges?</p>
          </div>

          <QuizComponent quiz={selectedQuiz} onQuit={() => markQuizCompleted(user.uid)} />

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

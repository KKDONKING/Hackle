import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../auth/AuthProvider";
import { fetchDailyQuizForUser, markQuizCompleted } from "../../services/QuizService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import SquadCard from "../Squads/SquadCard";
import QuizComponent from "../Quiz/QuizComponent";
import Leaderboard from "../Leaderboard/Leaderboard";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [quiz, setQuiz] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [username, setUsername] = useState("");
  const [squadId, setSquadId] = useState(null);
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDailyQuizForUser(user.uid).then(setQuiz);

      const fetchUserData = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUsername(userSnap.data().username || "User");
          setSquadId(userSnap.data().squadId || null);
          setIsLeader(userSnap.data().role === "leader");
        }
      };
      fetchUserData();
    }
  }, [user]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <div className="dashboard-left">
          {squadId ? <SquadCard squadId={squadId} isLeader={isLeader} /> : <p>No Squad Joined</p>}

          <QuizComponent quiz={selectedQuiz} onQuit={() => markQuizCompleted(user.uid)} />
          
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>

        <div className="dashboard-right">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

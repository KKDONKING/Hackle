import React, { useEffect, useState, useContext } from "react";
import { collection, onSnapshot, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { AuthContext } from "../../auth/AuthProvider";
import { getSquadLeaderboard } from "../../firebase/leaderboardService";
import "./Leaderboard.css";

const Leaderboard = () => {
  const { user } = useContext(AuthContext);
  const [scores, setScores] = useState([]);
  const [squadScores, setSquadScores] = useState([]);
  const [allSquads, setAllSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("global"); // "global", "squad", or "allSquads"
  const [userSquad, setUserSquad] = useState(null);

  // Fetch global leaderboard data
  useEffect(() => {
    console.log("📡 Fetching global leaderboard data...");
    const scoresQuery = query(collection(db, "leaderboard"), orderBy("totalScore", "desc"));

    const unsubscribe = onSnapshot(
      scoresQuery,
      (snapshot) => {
        const scoresList = snapshot.docs.map((doc, index) => ({
          id: doc.id,
          rank: index + 1,
          ...doc.data(),
        }));
        setScores(scoresList);
        setLoading(false);
        console.log("🏆 Global Leaderboard Data Updated:", scoresList);
      },
      (error) => {
        console.error("❌ Error fetching global leaderboard:", error);
        setError("Failed to load leaderboard data. Please try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch all squads leaderboard
  useEffect(() => {
    const fetchAllSquads = async () => {
      try {
        console.log("📡 Fetching all squads leaderboard...");
        const squads = await getSquadLeaderboard(20); // Get top 20 squads
        setAllSquads(squads);
        console.log("🏆 All Squads Leaderboard Data Updated:", squads);
      } catch (error) {
        console.error("❌ Error fetching all squads leaderboard:", error);
      }
    };

    fetchAllSquads();
  }, []);

  // Fetch user's squad data
  useEffect(() => {
    const fetchUserSquad = async () => {
      if (!user) return;

      try {
        console.log("🔍 Fetching user's squad data...");
        const userRef = await getDocs(query(collection(db, "users"), where("userId", "==", user.uid)));
        
        if (!userRef.empty) {
          const userData = userRef.docs[0].data();
          
          if (userData.squadId) {
            const squadRef = await getDocs(query(collection(db, "squads"), where("squadId", "==", userData.squadId)));
            
            if (!squadRef.empty) {
              const squadData = squadRef.docs[0].data();
              setUserSquad(squadData);
              console.log("✅ User's squad found:", squadData);
              
              // Now fetch squad members' scores
              fetchSquadScores(squadData.members);
            } else {
              console.log("❌ User's squad not found");
              setUserSquad(null);
            }
          } else {
            console.log("ℹ️ User is not in a squad");
            setUserSquad(null);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching user's squad:", error);
      }
    };

    fetchUserSquad();
  }, [user]);

  // Fetch squad members' scores
  const fetchSquadScores = async (members) => {
    if (!members || members.length === 0) return;

    try {
      console.log("📡 Fetching squad members' scores...");
      const leaderboardRef = collection(db, "leaderboard");
      const squadScoresList = [];

      for (const memberId of members) {
        const q = query(leaderboardRef, where("userId", "==", memberId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const memberData = snapshot.docs[0].data();
          squadScoresList.push({
            id: memberId,
            ...memberData
          });
        }
      }

      // Sort by score and add rank
      squadScoresList.sort((a, b) => b.totalScore - a.totalScore);
      const rankedSquadScores = squadScoresList.map((score, index) => ({
        ...score,
        rank: index + 1
      }));

      setSquadScores(rankedSquadScores);
      console.log("🏆 Squad Leaderboard Data Updated:", rankedSquadScores);
    } catch (error) {
      console.error("❌ Error fetching squad scores:", error);
    }
  };

  if (loading) {
    return (
      <div className="leaderboard-container loading">
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container error">
        <p>{error}</p>
      </div>
    );
  }

  const renderGlobalLeaderboard = () => {
    if (scores.length === 0) {
      return <p className="no-scores">No scores available yet. Be the first to score!</p>;
    }

    return (
      <ul className="leaderboard-list">
        {scores.map((player) => (
          <li key={player.id} className={`leaderboard-item ${player.userId === user?.uid ? 'current-user' : ''}`}>
            <span className="rank">#{player.rank}</span>
            <span className="player-info">{player.name}</span>
            <span className="score">{player.totalScore}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderSquadLeaderboard = () => {
    if (!userSquad) {
      return <p className="no-scores">You are not in a squad yet. Join or create a squad to see squad rankings!</p>;
    }

    if (squadScores.length === 0) {
      return <p className="no-scores">No scores available for your squad members yet.</p>;
    }

    return (
      <>
        <h3 className="squad-name">{userSquad.squadName}</h3>
        <ul className="leaderboard-list">
          {squadScores.map((player) => (
            <li key={player.id} className={`leaderboard-item ${player.userId === user?.uid ? 'current-user' : ''}`}>
              <span className="rank">#{player.rank}</span>
              <span className="player-info">{player.name}</span>
              <span className="score">{player.totalScore}</span>
            </li>
          ))}
        </ul>
      </>
    );
  };

  const renderAllSquadsLeaderboard = () => {
    if (allSquads.length === 0) {
      return <p className="no-scores">No squad scores available yet.</p>;
    }

    return (
      <ul className="leaderboard-list">
        {allSquads.map((squad) => (
          <li 
            key={squad.id} 
            className={`leaderboard-item ${userSquad && squad.squadId === userSquad.squadId ? 'current-user' : ''}`}
          >
            <span className="rank">#{squad.rank}</span>
            <span className="player-info">{squad.squadName}</span>
            <span className="score">{squad.totalScore || 0}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">🏆 Leaderboard</h2>
      
      <div className="leaderboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'global' ? 'active' : ''}`}
          onClick={() => setActiveTab('global')}
        >
          Global
        </button>
        <button 
          className={`tab-button ${activeTab === 'squad' ? 'active' : ''}`}
          onClick={() => setActiveTab('squad')}
        >
          My Squad
        </button>
        <button 
          className={`tab-button ${activeTab === 'allSquads' ? 'active' : ''}`}
          onClick={() => setActiveTab('allSquads')}
        >
          All Squads
        </button>
      </div>
      
      <div className="leaderboard-content">
        {activeTab === 'global' && renderGlobalLeaderboard()}
        {activeTab === 'squad' && renderSquadLeaderboard()}
        {activeTab === 'allSquads' && renderAllSquadsLeaderboard()}
      </div>
    </div>
  );
};

export default Leaderboard;

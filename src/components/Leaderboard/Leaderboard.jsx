import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import "./Leaderboard.css";

const Leaderboard = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("📡 Fetching leaderboard data...");
    const scoresQuery = query(collection(db, "leaderboard"), orderBy("totalScore", "desc"));

    const unsubscribe = onSnapshot(
      scoresQuery,
      (snapshot) => {
        const scoresList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setScores(scoresList);
        setLoading(false);
        console.log("🏆 Leaderboard Data Updated:", scoresList);
      },
      (error) => {
        console.error("❌ Error fetching leaderboard:", error);
        setError("Failed to load leaderboard data. Please try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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

  if (scores.length === 0) {
    return (
      <div className="leaderboard-container">
        <h2 className="leaderboard-title">Leaderboard</h2>
        <p className="no-scores">No scores available yet. Be the first to score!</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">🏆 Leaderboard</h2>
      <ul className="leaderboard-list">
        {scores.map((player, index) => (
          <li key={player.id} className="leaderboard-item">
            <span className="rank">#{index + 1}</span>
            <span className="player-info">{player.name}</span>
            <span className="score">{player.totalScore}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import "./Leaderboard.css";

const Leaderboard = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Loading leaderboard...</p>;
  if (scores.length === 0) return <p>No scores available.</p>;

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">Leaderboard</h2>
      <ul className="leaderboard-list">
        {scores.map((player, index) => (
          <li key={player.id} className="leaderboard-item">
            {index + 1}. {player.name} - {player.totalScore}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;

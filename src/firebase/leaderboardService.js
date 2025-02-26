// src/firebase/leaderboardService.js
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const addScore = async (name, score) => {
  try {
    await addDoc(collection(db, "leaderboard"), {
      name,
      score
    });
    console.log("✅ Score added successfully!");
  } catch (error) {
    console.error("❌ Error adding score:", error);
  }
};

// src/firebase/leaderboardService.js
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const addScore = async (userId, name, newScore) => {
  try {
    const leaderboardRef = collection(db, "leaderboard");

    // Check if user already has a score entry
    const q = query(leaderboardRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // User already has a score, update it
      const docRef = snapshot.docs[0].ref;
      const existingData = snapshot.docs[0].data();

      const updatedScore = existingData.totalScore + newScore;
      await setDoc(docRef, { totalScore: updatedScore }, { merge: true });
      console.log(`✅ Score updated: ${name} now has ${updatedScore} points.`);
    } else {
      // New entry for the user
      const newDocRef = doc(db, "leaderboard", userId);
      await setDoc(newDocRef, { userId, name, totalScore: newScore });
      console.log(`✅ New score added: ${name} - ${newScore}`);
    }
  } catch (error) {
    console.error("❌ Error updating score:", error);
  }
};

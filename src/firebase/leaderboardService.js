// src/firebase/leaderboardService.js
import { collection, query, where, getDocs, setDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const addScore = async (userId, name, newScore, squadId = null) => {
  try {
    console.log(`🔄 Adding score for user ${userId} (${name}): ${newScore} points`);
    
    // Update user's individual score
    const leaderboardRef = collection(db, "leaderboard");

    // Check if user already has a score entry
    const q = query(leaderboardRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // User already has a score, update it
      const docRef = snapshot.docs[0].ref;
      const existingData = snapshot.docs[0].data();

      const updatedScore = existingData.totalScore + newScore;
      await updateDoc(docRef, { 
        totalScore: updatedScore,
        lastUpdated: new Date().toISOString()
      });
      console.log(`✅ Score updated: ${name} now has ${updatedScore} points.`);
    } else {
      // New entry for the user
      const newDocRef = doc(db, "leaderboard", userId);
      await setDoc(newDocRef, { 
        userId, 
        name, 
        totalScore: newScore,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      console.log(`✅ New score added: ${name} - ${newScore}`);
    }

    // If user is in a squad, update squad score as well
    if (squadId) {
      await updateSquadScore(squadId, newScore);
    }
  } catch (error) {
    console.error("❌ Error updating score:", error);
    throw error;
  }
};

export const updateSquadScore = async (squadId, scoreToAdd) => {
  try {
    console.log(`🔄 Updating squad ${squadId} score: +${scoreToAdd} points`);
    
    const squadRef = doc(db, "squads", squadId);
    const squadSnap = await getDoc(squadRef);
    
    if (squadSnap.exists()) {
      const squadData = squadSnap.data();
      const currentScore = squadData.totalScore || 0;
      const updatedScore = currentScore + scoreToAdd;
      
      await updateDoc(squadRef, {
        totalScore: updatedScore,
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`✅ Squad score updated: now ${updatedScore} points`);
    } else {
      console.error(`❌ Squad ${squadId} not found`);
    }
  } catch (error) {
    console.error("❌ Error updating squad score:", error);
    throw error;
  }
};

export const getSquadLeaderboard = async (limit = 10) => {
  try {
    console.log(`🔄 Fetching squad leaderboard (top ${limit})`);
    
    const squadsRef = collection(db, "squads");
    const squadsQuery = query(squadsRef);
    const snapshot = await getDocs(squadsQuery);
    
    if (snapshot.empty) {
      console.log("ℹ️ No squads found");
      return [];
    }
    
    // Map and sort squads by totalScore
    const squads = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(squad => !squad._isInitial) // Filter out initial/system squads
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
      .slice(0, limit);
    
    // Add rank to each squad
    const rankedSquads = squads.map((squad, index) => ({
      ...squad,
      rank: index + 1
    }));
    
    console.log(`✅ Fetched ${rankedSquads.length} squads for leaderboard`);
    return rankedSquads;
  } catch (error) {
    console.error("❌ Error fetching squad leaderboard:", error);
    throw error;
  }
};

export const getUserRank = async (userId) => {
  try {
    console.log(`🔄 Getting rank for user ${userId}`);
    
    // Get all scores ordered by totalScore
    const leaderboardRef = collection(db, "leaderboard");
    const scoresQuery = query(leaderboardRef);
    const snapshot = await getDocs(scoresQuery);
    
    if (snapshot.empty) {
      console.log("ℹ️ No scores found");
      return null;
    }
    
    // Sort scores by totalScore
    const scores = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
    
    // Find user's position
    const userIndex = scores.findIndex(score => score.userId === userId);
    
    if (userIndex === -1) {
      console.log(`ℹ️ User ${userId} not found in leaderboard`);
      return null;
    }
    
    const rank = userIndex + 1;
    console.log(`✅ User ${userId} rank: ${rank} of ${scores.length}`);
    
    return {
      rank,
      totalPlayers: scores.length,
      score: scores[userIndex].totalScore
    };
  } catch (error) {
    console.error("❌ Error getting user rank:", error);
    throw error;
  }
};

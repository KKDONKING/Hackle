// src/services/QuizService.js
import { collection, query, where, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Function to get today's date as YYYY-MM-DD
const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

export const fetchDailyQuizForUser = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    let lastCompletedDate = userSnap.exists() ? userSnap.data().lastCompletedDate : null;
    const today = getTodayDate();

    if (lastCompletedDate === today) {
      console.log("✅ User already completed today's quiz.");
      return null; // Quiz should disappear
    }

    // Fetch a random quiz from Firestore
    const quizQuery = query(collection(db, "quizzes"));
    const snapshot = await getDocs(quizQuery);
    const quizList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (quizList.length === 0) return null;

    // Pick a random quiz
    const randomQuiz = quizList[Math.floor(Math.random() * quizList.length)];

    return randomQuiz;
  } catch (error) {
    console.error("❌ Error fetching quiz:", error);
    return null;
  }
};

// Mark quiz as completed for the day
export const markQuizCompleted = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { lastCompletedDate: getTodayDate() }, { merge: true });
    console.log("✅ Quiz marked as completed for today.");
  } catch (error) {
    console.error("❌ Error marking quiz as completed:", error);
  }
};

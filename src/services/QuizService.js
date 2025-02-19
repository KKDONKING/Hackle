import { db } from "../firebase/firebase";
import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from "firebase/firestore";

export const fetchDailyQuizzes = async (userId) => {
  if (!userId) {
    console.error("🚨 fetchDailyQuizzes: userId is undefined!");
    return [];
  }

  try {
    console.log("📢 Fetching daily quizzes for user:", userId);
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const todayStr = new Date().toISOString().split("T")[0];

    if (userDoc.exists() && userDoc.data().lastQuizDate === todayStr) {
      console.log("✅ User already has quizzes for today:", userDoc.data().dailyQuizzes);
      const dailyQuizIds = userDoc.data().dailyQuizzes || [];
      if (dailyQuizIds.length === 0) return [];

      const quizzes = await Promise.all(
        dailyQuizIds.map(async (quizId) => {
          const quizDoc = await getDoc(doc(db, "quizzes", quizId));
          return quizDoc.exists() ? { id: quizId, ...quizDoc.data() } : null;
        })
      );

      return quizzes.filter(q => q !== null);
    } else {
      console.log("📢 Assigning new daily quizzes...");
      return await assignDailyQuizzes(userId);
    }
  } catch (error) {
    console.error("🚨 Error fetching daily quizzes:", error);
    return [];
  }
};

// Assign new quizzes if none exist
const assignDailyQuizzes = async (userId) => {
  try {
    console.log("📢 Fetching new quizzes for assignment...");
    const quizQuery = query(collection(db, "quizzes"), where("createdAt", "<=", Timestamp.now()));
    const quizDocs = await getDocs(quizQuery);

    const quizzes = quizDocs.docs.sort(() => 0.5 - Math.random()).slice(0, 3);
    if (quizzes.length === 0) {
      console.warn("⚠️ No quizzes found in Firestore!");
      return [];
    }

    const quizIds = quizzes.map(quiz => quiz.id);
    const userRef = doc(db, "users", userId);

    await setDoc(userRef, {
      dailyQuizzes: quizIds,
      lastQuizDate: new Date().toISOString().split("T")[0],
    }, { merge: true });

    console.log("✅ Assigned new quizzes:", quizIds);
    return quizzes.map(quiz => ({ id: quiz.id, ...quiz.data() }));
  } catch (error) {
    console.error("🚨 Error assigning daily quizzes:", error);
    return [];
  }
};

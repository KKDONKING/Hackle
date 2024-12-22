import { db } from "../firebase/firebase";
import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from "firebase/firestore";

// Fetch quizzes for the day
export const fetchDailyQuizzes = async (userId) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Check if the user already has today's quizzes
  if (userDoc.exists() && userDoc.data().lastQuizDate === todayStr) {
    const dailyQuizIds = userDoc.data().dailyQuizzes;
    const quizzes = await Promise.all(
      dailyQuizIds.map(async (quizId) => {
        const quizDoc = await getDoc(doc(db, "quizzes", quizId));
        return { id: quizId, ...quizDoc.data() };
      })
    );
    return quizzes;
  } else {
    // Generate new quizzes for the day
    return await assignDailyQuizzes(userId);
  }
};

// Assign daily quizzes to the user
const assignDailyQuizzes = async (userId) => {
  const quizQuery = query(collection(db, "quizzes"), where("createdAt", "<=", Timestamp.now()));
  const quizDocs = await getDocs(quizQuery);

  // Randomly pick 3 quizzes
  const quizzes = quizDocs.docs.sort(() => 0.5 - Math.random()).slice(0, 3);

  const quizIds = quizzes.map((quiz) => quiz.id);
  const userRef = doc(db, "users", userId);

  // Update user data with today's quizzes
  await setDoc(
    userRef,
    {
      dailyQuizzes: quizIds,
      lastQuizDate: new Date().toISOString().split("T")[0],
    },
    { merge: true }
  );

  return quizzes.map((quiz) => ({ id: quiz.id, ...quiz.data() }));
};

// Save user quiz progress
export const saveQuizProgress = async (userId, quizId, progress) => {
  const userRef = doc(db, "users", userId);

  await setDoc(
    userRef,
    {
      quizProgress: {
        [quizId]: progress,
      },
    },
    { merge: true }
  );
};

// Fetch quiz progress
export const fetchQuizProgress = async (userId, quizId) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists() && userDoc.data().quizProgress) {
    return userDoc.data().quizProgress[quizId] || null;
  }
  return null;
};

// src/services/QuizService.js
import { collection, query, where, getDocs, setDoc, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Function to get today's date as YYYY-MM-DD
const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

export const fetchDailyQuizForUser = async (userId) => {
  try {
    console.log("🔍 Fetching daily quiz for user:", userId);
    
    if (!userId) {
      console.error("❌ No user ID provided");
      throw new Error("User must be logged in to fetch daily quiz");
    }

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log("ℹ️ User document doesn't exist yet");
    } else {
      console.log("👤 User data:", userSnap.data());
    }

    let lastCompletedDate = userSnap.exists() ? userSnap.data().lastCompletedDate : null;
    const today = getTodayDate();

    console.log(`📅 Last completed: ${lastCompletedDate || 'never'}, Today: ${today}`);

    // Check if the user has already completed today's quiz
    if (lastCompletedDate === today) {
      console.log("✅ User already completed today's quiz.");
      return { 
        alreadyCompleted: true,
        message: "You've already completed today's quiz. Come back tomorrow for a new challenge!"
      };
    }

    // Fetch a random quiz from the database
    const quizzesRef = collection(db, "quizzes");
    const quizzesSnap = await getDocs(quizzesRef);
    
    if (quizzesSnap.empty) {
      console.log("❌ No quizzes found in the database");
      return { error: "No quizzes available. Please try again later." };
    }

    const quizzes = [];
    quizzesSnap.forEach(doc => {
      const quizData = doc.data();
      quizData.id = doc.id;
      quizzes.push(quizData);
    });

    // Select a random quiz
    const randomIndex = Math.floor(Math.random() * quizzes.length);
    const selectedQuiz = quizzes[randomIndex];
    
    console.log("✅ Selected quiz:", selectedQuiz.title);
    return selectedQuiz;
  } catch (error) {
    console.error("❌ Error fetching daily quiz:", error);
    throw error;
  }
};

// Mark quiz as completed for the day
export const markQuizCompleted = async (userId) => {
  try {
    if (!userId) {
      console.error("❌ No user ID provided for marking quiz completed");
      return false;
    }
    
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error("❌ User document doesn't exist");
      return false;
    }
    
    const userData = userSnap.data();
    const today = getTodayDate();
    
    // Check if the user has already completed a quiz today
    if (userData.lastCompletedDate === today) {
      console.log("⚠️ User already completed a quiz today");
      return false;
    }
    
    const updatedData = {
      lastCompletedDate: today,
      quizzesCompleted: (userData.quizzesCompleted || 0) + 1
    };
    
    await setDoc(userRef, updatedData, { merge: true });
    console.log("✅ Quiz marked as completed for today.");
    return true;
  } catch (error) {
    console.error("❌ Error marking quiz as completed:", error);
    throw error;
  }
};

/**
 * Add a new quiz to Firebase
 * @param {object} quizData - The quiz data with the following structure:
 * {
 *   title: string,
 *   description: string,
 *   difficulty: string, // e.g., "easy", "medium", "hard"
 *   category: string,   // e.g., "general", "programming", "science"
 *   questions: [
 *     {
 *       question: string,
 *       options: string[],  // Array of option strings
 *       correctAnswer: string  // Must match one of the options exactly
 *     },
 *     ...
 *   ]
 * }
 * @returns {Promise<string>} The ID of the created quiz
 */
export const addQuizToFirebase = async (quizData) => {
  try {
    console.log("📝 Adding quiz to Firebase:", {
      title: quizData.title,
      description: quizData.description,
      questionCount: quizData.questions ? quizData.questions.length : 0
    });

    // Validate quiz data
    if (!quizData.title || !quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      console.error("❌ Invalid quiz data:", {
        hasTitle: Boolean(quizData.title),
        hasQuestions: Boolean(quizData.questions),
        isQuestionsArray: Array.isArray(quizData.questions),
        questionCount: quizData.questions ? quizData.questions.length : 0
      });
      throw new Error("Invalid quiz data: Quiz must have a title and at least one question");
    }

    // Validate each question
    quizData.questions.forEach((question, index) => {
      const isValid = question.question && 
                     question.options && 
                     Array.isArray(question.options) && 
                     question.options.length >= 2 &&
                     question.correctAnswer &&
                     question.options.includes(question.correctAnswer);

      console.log(`Question ${index + 1} validation:`, {
        hasQuestion: Boolean(question.question),
        hasOptions: Boolean(question.options),
        isOptionsArray: Array.isArray(question.options),
        optionCount: question.options ? question.options.length : 0,
        hasCorrectAnswer: Boolean(question.correctAnswer),
        isCorrectAnswerValid: question.options ? question.options.includes(question.correctAnswer) : false,
        isValid: isValid
      });

      if (!isValid) {
        if (!question.question || !question.options || !Array.isArray(question.options) || question.options.length < 2) {
          throw new Error(`Invalid question at index ${index}: Question must have text and at least 2 options`);
        }
        
        if (!question.correctAnswer || !question.options.includes(question.correctAnswer)) {
          throw new Error(`Invalid question at index ${index}: Correct answer must be one of the options`);
        }
      }
    });

    // Add timestamp and metadata
    const quizWithTimestamp = {
      ...quizData,
      createdAt: new Date(),
      status: 'active',
      version: '1.0'
    };

    console.log("🔄 Attempting to add quiz to Firestore...");

    // Add to Firestore
    const quizRef = await addDoc(collection(db, "quizzes"), quizWithTimestamp);
    console.log("✅ Quiz added successfully with ID:", quizRef.id);

    // Verify the quiz was added by reading it back
    const addedQuiz = await getDoc(quizRef);
    if (addedQuiz.exists()) {
      console.log("✅ Verified quiz was added:", {
        id: addedQuiz.id,
        title: addedQuiz.data().title,
        questionCount: addedQuiz.data().questions.length
      });
    } else {
      console.warn("⚠️ Quiz was added but could not be verified");
    }

    return quizRef.id;
  } catch (error) {
    console.error("❌ Error adding quiz:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Set a user as an admin
 * @param {string} userId - The ID of the user to set as admin
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export const setUserAsAdmin = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("User not found");
    }
    
    await updateDoc(userRef, {
      role: "admin",
      lastUpdated: new Date().toISOString()
    });
    
    console.log("✅ User set as admin successfully");
    return true;
  } catch (error) {
    console.error("❌ Error setting user as admin:", error);
    throw error;
  }
};

/**
 * Check if a user is an admin
 * @param {string} userId - The ID of the user to check
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise
 */
export const isUserAdmin = async (userId) => {
  try {
    if (!userId) return false;
    
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return false;
    
    const userData = userSnap.data();
    return userData.role === "admin";
  } catch (error) {
    console.error("❌ Error checking if user is admin:", error);
    return false;
  }
};

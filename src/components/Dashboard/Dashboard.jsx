import { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../../auth/AuthProvider";
import { fetchDailyQuizForUser, markQuizCompleted, setUserAsAdmin, isUserAdmin } from "../../services/QuizService";
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import SquadCard from "../Squads/SquadCard";
import QuizComponent from "../Quiz/QuizComponent";
import QuizForm from "../Quiz/QuizForm";
import Leaderboard from "../Leaderboard/Leaderboard";
import { createSquad } from "../../firebase/squadService";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizError, setQuizError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [username, setUsername] = useState("");
  const [squadId, setSquadId] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalScore: 0,
    quizzesCompleted: 0,
    rank: '-'
  });
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [adminActivated, setAdminActivated] = useState(false);
  const [showEditSquadForm, setShowEditSquadForm] = useState(false);
  const [squadData, setSquadData] = useState(null);
  const [squadError, setSquadError] = useState(null);
  const [squadLoading, setSquadLoading] = useState(false);

  // Fetch quiz data
  const fetchQuizData = useCallback(async () => {
    if (!user) return;
    
    try {
      setQuizLoading(true);
      setQuizError(null);
      const quizData = await fetchDailyQuizForUser(user.uid);
      console.log("📋 Quiz data fetched:", quizData ? "Success" : "No quiz available");
      setQuiz(quizData);
    } catch (error) {
      console.error("❌ Error fetching quiz:", error);
      setQuizError(error.message || "Failed to fetch quiz");
    } finally {
      setQuizLoading(false);
    }
  }, [user]);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUsername(userData.username || "User");
        setIsAdmin(userData.role === "admin");
        
        // Handle squad data
        await handleSquadData(userData, userRef);

        // Update stats
        setStats({
          totalScore: userData.totalScore || 0,
          quizzesCompleted: userData.quizzesCompleted || 0,
          rank: userData.rank || '-'
        });
      } else {
        // Create user document if it doesn't exist
        await createNewUserDocument(userRef);
        setUsername("User");
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
    }
  }, [user]);

  // Fetch squad data
  const fetchSquadData = useCallback(async () => {
    if (!squadId || !user) return;
    
    try {
      setSquadLoading(true);
      setSquadError(null);
      
      const squadRef = doc(db, "squads", squadId);
      const squadSnap = await getDoc(squadRef);
      
      if (squadSnap.exists()) {
        const data = squadSnap.data();
        console.log("📋 Squad data fetched:", data);
        setSquadData(data);
      } else {
        console.log("❌ Squad not found");
        setSquadError("Squad not found");
        setSquadData(null);
      }
    } catch (error) {
      console.error("❌ Error fetching squad data:", error);
      setSquadError(error.message || "Failed to fetch squad data");
      setSquadData(null);
    } finally {
      setSquadLoading(false);
    }
  }, [squadId, user]);

  // Handle squad data
  const handleSquadData = async (userData, userRef) => {
    if (!userData.squadId) {
      setSquadId(null);
      setIsLeader(false);
      return;
    }
    
    try {
      const squadRef = doc(db, "squads", userData.squadId);
      const squadSnap = await getDoc(squadRef);
      
      if (!squadSnap.exists()) {
        console.log("🧹 Clearing stale squad reference");
        await updateDoc(userRef, {
          squadId: null,
          role: null,
          lastUpdated: new Date().toISOString()
        });
        setSquadId(null);
        setIsLeader(false);
      } else {
        setSquadId(userData.squadId);
        setIsLeader(userData.role === "leader");
      }
    } catch (error) {
      console.error("❌ Error checking squad:", error);
      setSquadId(null);
      setIsLeader(false);
    }
  };

  // Create new user document
  const createNewUserDocument = async (userRef) => {
    if (!user) return;
    
    await setDoc(userRef, {
      userId: user.uid,
      username: "User",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalScore: 0,
      quizzesCompleted: 0,
      rank: '-'
    });
  };

  // Load user and quiz data on component mount
  useEffect(() => {
    if (user) {
      fetchQuizData();
      fetchUserData();
    }
  }, [user, fetchQuizData, fetchUserData]);

  // Fetch squad data when squadId changes
  useEffect(() => {
    if (squadId) {
      fetchSquadData();
    } else {
      setSquadData(null);
    }
  }, [squadId, fetchSquadData]);

  // Reset admin click count after 3 seconds of inactivity
  useEffect(() => {
    if (adminClickCount === 0) return;
    
    const timer = setTimeout(() => {
      setAdminClickCount(0);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [adminClickCount]);

  // Check if user should be activated as admin
  useEffect(() => {
    if (adminClickCount < 5 || isAdmin || !user || adminActivated) return;
    
    const activateAdmin = async () => {
      try {
        await setUserAsAdmin(user.uid);
        setIsAdmin(true);
        setAdminActivated(true);
        console.log("🔑 Admin privileges activated!");
        alert("Admin privileges activated! You can now create quizzes.");
      } catch (error) {
        console.error("❌ Failed to set user as admin:", error);
      }
    };
    
    activateAdmin();
  }, [adminClickCount, isAdmin, user, adminActivated]);

  // Handle squad creation
  const handleCreateSquad = async (squadData) => {
    try {
      if (!user) {
        throw new Error("User must be logged in to create a squad");
      }

      console.log("🔄 Creating squad with data:", squadData);
      const newSquadId = await createSquad(user.uid, squadData);
      console.log("✅ Squad created with ID:", newSquadId);
      
      // Update local state
      setSquadId(newSquadId);
      setIsLeader(true);

      // Refresh user data
      await fetchUserData();
      
      return newSquadId;
    } catch (error) {
      console.error("❌ Error creating squad:", error);
      throw new Error(error.message || "Failed to create squad. Please try again.");
    }
  };

  // Handle squad update
  const handleUpdateSquad = async (updatedData) => {
    try {
      if (!user || !squadId) {
        throw new Error("User must be logged in and squad must exist to update");
      }

      if (!isLeader) {
        throw new Error("Only squad leaders can update squad details");
      }

      console.log("🔄 Updating squad with data:", updatedData);
      
      const squadRef = doc(db, "squads", squadId);
      await updateDoc(squadRef, {
        ...updatedData,
        lastUpdated: new Date().toISOString()
      });
      
      console.log("✅ Squad updated successfully");
      
      // Refresh squad data
      await fetchSquadData();
      setShowEditSquadForm(false);
      
      return true;
    } catch (error) {
      console.error("❌ Error updating squad:", error);
      throw new Error(error.message || "Failed to update squad. Please try again.");
    }
  };

  // Handle squad deletion
  const handleDeleteSquad = async () => {
    try {
      if (!user || !squadId) {
        throw new Error("User must be logged in and squad must exist to delete");
      }

      if (!isLeader) {
        throw new Error("Only squad leaders can delete squads");
      }

      // Confirm deletion
      if (!window.confirm("Are you sure you want to delete this squad? This action cannot be undone.")) {
        return false;
      }

      console.log("🔄 Deleting squad:", squadId);
      
      // Get all members of the squad
      const squadRef = doc(db, "squads", squadId);
      const squadSnap = await getDoc(squadRef);
      
      if (!squadSnap.exists()) {
        throw new Error("Squad not found");
      }
      
      const squadData = squadSnap.data();
      const memberIds = squadData.members || [];
      
      // Update all member documents to remove squad reference
      for (const memberId of memberIds) {
        const memberRef = doc(db, "users", memberId);
        const memberSnap = await getDoc(memberRef);
        
        if (memberSnap.exists()) {
          await updateDoc(memberRef, {
            squadId: null,
            role: null,
            lastUpdated: new Date().toISOString()
          });
          console.log(`✅ Updated member ${memberId} to remove squad reference`);
        }
      }
      
      // Delete the squad document
      await deleteDoc(squadRef);
      console.log("✅ Squad deleted successfully");
      
      // Update local state
      setSquadId(null);
      setIsLeader(false);
      setSquadData(null);
      setShowEditSquadForm(false);
      
      // Refresh user data
      await fetchUserData();
      
      return true;
    } catch (error) {
      console.error("❌ Error deleting squad:", error);
      throw new Error(error.message || "Failed to delete squad. Please try again.");
    }
  };

  // Handle quiz creation
  const handleQuizCreated = (quizId) => {
    console.log("✅ Quiz created with ID:", quizId);
    setShowQuizForm(false);
    fetchQuizData(); // Refresh quiz data
  };

  // Handle title click for admin activation
  const handleTitleClick = () => {
    setAdminClickCount(prev => prev + 1);
  };

  // Handle quiz completion
  const handleQuizComplete = async () => {
    if (!user) return;
    
    await markQuizCompleted(user.uid);
    setSelectedQuiz(null);
    fetchUserData(); // Refresh user data to update stats
  };

  // Toggle edit squad form
  const toggleEditSquadForm = () => {
    setShowEditSquadForm(prev => !prev);
  };

  // Redirect non-admin users away from quiz form
  if (showQuizForm && !isAdmin) {
    setShowQuizForm(false);
  }

  // Render quiz form for admins
  if (showQuizForm && isAdmin) {
    return (
      <div className="dashboard-container">
        <QuizForm 
          onQuizAdded={handleQuizCreated}
          onCancel={() => setShowQuizForm(false)}
        />
      </div>
    );
  }

  // Render squad edit form
  if (showEditSquadForm && isLeader && squadData) {
    return (
      <div className="dashboard-container">
        <div className="edit-squad-container">
          <h2>Edit Squad</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updatedData = {
              name: formData.get('name'),
              description: formData.get('description'),
              maxMembers: parseInt(formData.get('maxMembers'), 10)
            };
            handleUpdateSquad(updatedData);
          }}>
            <div className="form-group">
              <label htmlFor="name">Squad Name</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                defaultValue={squadData.name || ''} 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea 
                id="description" 
                name="description" 
                defaultValue={squadData.description || ''} 
                rows="4"
              />
            </div>
            <div className="form-group">
              <label htmlFor="maxMembers">Maximum Members</label>
              <input 
                type="number" 
                id="maxMembers" 
                name="maxMembers" 
                min="2" 
                max="20" 
                defaultValue={squadData.maxMembers || 5} 
                required 
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Save Changes</button>
              <button type="button" className="btn-secondary" onClick={toggleEditSquadForm}>Cancel</button>
              <button 
                type="button" 
                className="btn-danger" 
                onClick={handleDeleteSquad}
              >
                Delete Squad
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Render quiz component or dashboard
  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <div className="dashboard-left">
          <SquadCard 
            squadId={squadId} 
            isLeader={isLeader} 
            user={user} 
            onCreate={handleCreateSquad}
            onEdit={isLeader ? toggleEditSquadForm : undefined}
            onDelete={isLeader ? handleDeleteSquad : undefined}
            squadData={squadData}
            loading={squadLoading}
            error={squadError}
          />
        </div>

        <div className="dashboard-center">
          <div className="welcome-section animate-fade-in">
            <h1 onClick={handleTitleClick}>Welcome back, {username}! 👋</h1>
            <p>Ready to take on today's challenges?</p>
          </div>

          {isAdmin && (
            <div className="admin-actions">
              <button 
                className="create-quiz-btn" 
                onClick={() => setShowQuizForm(true)}
              >
                Create New Quiz
              </button>
            </div>
          )}

          {selectedQuiz ? (
            <QuizComponent 
              quiz={selectedQuiz} 
              onQuit={handleQuizComplete} 
            />
          ) : (
            <>
              {renderQuizCard()}
            </>
          )}

          <div className="stats-grid animate-slide-up">
            <div className="stat-card">
              <h3>Total Score</h3>
              <div className="value">{stats.totalScore}</div>
            </div>
            <div className="stat-card">
              <h3>Quizzes Completed</h3>
              <div className="value">{stats.quizzesCompleted}</div>
            </div>
            <div className="stat-card">
              <h3>Current Rank</h3>
              <div className="value">{stats.rank}</div>
            </div>
          </div>

          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="dashboard-right">
          <Leaderboard />
        </div>
      </div>
    </div>
  );

  // Helper function to render the appropriate quiz card
  function renderQuizCard() {
    if (quizLoading) {
      return (
        <div className="daily-quiz-card">
          <h2>Loading Quiz...</h2>
          <p className="quiz-description">Please wait while we prepare your daily challenge</p>
        </div>
      );
    }
    
    if (quizError) {
      return (
        <div className="daily-quiz-card error">
          <h2>Error Loading Quiz</h2>
          <p className="quiz-description">{quizError}</p>
          <button 
            className="start-quiz-btn"
            onClick={() => fetchQuizData()}
          >
            Retry
          </button>
        </div>
      );
    }
    
    if (quiz) {
      return (
        <div className="daily-quiz-card">
          <h2>Today's Quiz</h2>
          <p>{quiz.title}</p>
          <p className="quiz-description">{quiz.description || "Test your knowledge with today's quiz!"}</p>
          <button 
            className="start-quiz-btn"
            onClick={() => setSelectedQuiz(quiz)}
          >
            Start Quiz
          </button>
        </div>
      );
    }
    
    return (
      <div className="daily-quiz-card completed">
        <h2>No Quiz Available</h2>
        <p className="quiz-description">
          {isAdmin 
            ? "You've already completed today's quiz or there are no quizzes in the database. As an admin, you can create a new quiz."
            : "You've already completed today's quiz. Come back tomorrow for a new challenge!"}
        </p>
        {isAdmin && (
          <button 
            className="start-quiz-btn"
            onClick={() => setShowQuizForm(true)}
          >
            Create New Quiz
          </button>
        )}
      </div>
    );
  }
};

export default Dashboard;

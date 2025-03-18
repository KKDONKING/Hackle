import { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../../auth/AuthProvider";
import { fetchDailyQuizForUser, markQuizCompleted, setUserAsAdmin, isUserAdmin, addQuizToFirebase } from "../../services/QuizService";
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import SquadCard from "../Squads/SquadCard";
import QuizComponent from "../Quiz/QuizComponent";
import QuizForm from "../Quiz/QuizForm";
import Leaderboard from "../Leaderboard/Leaderboard";
import { createSquad, getUserSquads, updateSquad, deleteSquad, searchSquads, joinSquad } from "../../firebase/squadService";
import { getSquadLeaderboard } from "../../firebase/leaderboardService";
import "./Dashboard.css";
import { toast } from "react-hot-toast";
import defaultProfileImage from "../../assets/pfp.png";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
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
    rank: '-',
    streak: 0,
    maxStreak: 0
  });
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [adminActivated, setAdminActivated] = useState(false);
  const [showEditSquadForm, setShowEditSquadForm] = useState(false);
  const [squadData, setSquadData] = useState(null);
  const [squadError, setSquadError] = useState(null);
  const [squadLoading, setSquadLoading] = useState(false);
  const [userSquads, setUserSquads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isDefaultImage, setIsDefaultImage] = useState(true);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [streakIncreased, setStreakIncreased] = useState(false);

  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        toast.error("Please select an image file");
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setIsDefaultImage(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read the image file");
        setPreviewImage(defaultProfileImage);
        setIsDefaultImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle reset image
  const handleResetImage = () => {
    setPreviewImage(defaultProfileImage);
    setIsDefaultImage(true);
  };

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

          // Update personal stats
          setStats(prevStats => ({
            ...prevStats,
            totalScore: userData.totalScore || 0,
            quizzesCompleted: userData.quizzesCompleted || 0,
            streak: userData.streak || 0,
            maxStreak: userData.maxStreak || 0
          }));
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

  // Inside the component, add the fetchUserSquads function
  const fetchUserSquads = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const squads = await getUserSquads(user.uid);
      setUserSquads(squads);
    } catch (err) {
      console.error("Error fetching user squads:", err);
      setError(err.message || "Failed to fetch squads");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Handle squad data
  const handleSquadData = async (userData, userRef) => {
    setSquadId(userData.squadId || null);
    setIsLeader(userData.isSquadLeader || false);

    if (userData.squadId) {
      try {
        // Get squad data first
        const squadRef = doc(db, "squads", userData.squadId);
        const squadSnap = await getDoc(squadRef);
        const squadData = squadSnap.exists() ? squadSnap.data() : null;
        
        // Get all squads to find the user's squad rank and score
        const allSquads = await getSquadLeaderboard(50);
        const userSquad = allSquads.find(squad => squad.squadId === userData.squadId);
        
        if (userSquad && squadData) {
          setStats(prevStats => ({
            ...prevStats,
            rank: userSquad.rank,
            squadScore: squadData.totalScore || 0 // Use the direct squad data
          }));
        } else if (squadData) {
          // If we couldn't get rank but have squad data
          setStats(prevStats => ({
            ...prevStats,
            rank: '-',
            squadScore: squadData.totalScore || 0
          }));
        } else {
          // Reset squad stats if no data available
          setStats(prevStats => ({
            ...prevStats,
            rank: '-',
            squadScore: 0
          }));
        }
      } catch (error) {
        console.error("Error fetching squad data:", error);
        setStats(prevStats => ({
          ...prevStats,
          rank: '-',
          squadScore: 0
        }));
      }
    } else {
      // User is not in a squad
      setStats(prevStats => ({
        ...prevStats,
        rank: '-',
        squadScore: 0
      }));
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
      rank: '-',
      streak: 0,
      maxStreak: 0
    });
  };

  // Handle squad creation
  const handleCreateSquad = async (squadData) => {
    try {
      if (!user) {
        throw new Error("User must be logged in to create a squad");
      }

      console.log("🔄 Creating squad with data:", squadData);
      const newSquadId = await createSquad(user.uid, squadData);
      console.log("✅ Squad created with ID:", newSquadId);
      
      // Update user's squad data
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        squadId: newSquadId,
        role: "leader",
        lastUpdated: new Date().toISOString()
      });

      // Update local state
      setSquadId(newSquadId);
      setIsLeader(true);

      // Refresh user data and squads
      await fetchUserData();
      await fetchUserSquads();
      
      return newSquadId;
    } catch (error) {
      console.error("❌ Error creating squad:", error);
      throw new Error(error.message || "Failed to create squad. Please try again.");
    }
  };

  // Handle squad update
  const handleUpdateSquad = async (squadId, updatedData) => {
    if (!user) {
      toast.error("You must be logged in to update a squad");
      return;
    }
    
    try {
      await updateSquad(user.uid, squadId, updatedData);
      toast.success("Squad updated successfully!");
      
      // Update the squads list without page refresh
      await fetchUserSquads();
      
      // Close the edit form and reset state
      setShowEditSquadForm(false);
      setSquadId(null);
      setSquadData(null);
      setPreviewImage(null);
      setIsDefaultImage(true);
    } catch (error) {
      console.error("Error updating squad:", error);
      toast.error(error.message || "Failed to update squad");
    }
  };

  // Handle squad deletion
  const handleDeleteSquad = async (squadId) => {
    if (!user) {
      toast.error("You must be logged in to delete a squad");
      return;
    }
    
    try {
      await deleteSquad(user.uid, squadId);
      toast.success("Squad deleted successfully!");
      
      // Update the squads list without page refresh
      await fetchUserSquads();
    } catch (error) {
      console.error("Error deleting squad:", error);
      toast.error(error.message || "Failed to delete squad");
    }
  };

  // Handle squad editing
  const handleEditSquad = (squadId, squadData) => {
    setSquadId(squadId);
    setSquadData(squadData);
    setIsLeader(squadData.ownerId === user?.uid);
    setShowEditSquadForm(true);
    
    // Initialize image state when editing
    setPreviewImage(squadData.image || defaultProfileImage);
    setIsDefaultImage(!squadData.image || squadData.image === defaultProfileImage);
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
  const handleQuizComplete = async (score) => {
    if (!user) return;
    
    console.log(`Quiz completed with score: ${score}`);
    
    if (score !== undefined && score !== null) {
      try {
        // Get current streak before updating
        const userRef = doc(db, "users", user.uid);
        const userSnapBefore = await getDoc(userRef);
        const currentStreak = userSnapBefore.exists() ? (userSnapBefore.data().streak || 0) : 0;
        
        // Mark the quiz as completed and check if it was successful
        const quizMarked = await markQuizCompleted(user.uid);
        
        if (quizMarked) {
          // Update user's stats
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const newTotalScore = (userData.totalScore || 0) + score;
            
            // Check if streak increased
            if (userData.streak > currentStreak) {
              setStreakIncreased(true);
              setTimeout(() => setStreakIncreased(false), 2000);
            }
            
            // Update the user's total score
            await updateDoc(userRef, {
              totalScore: newTotalScore
            });
            
            // If the user is in a squad, update the squad's total score
            if (userData.squadId) {
              try {
                const squadRef = doc(db, "squads", userData.squadId);
                const squadSnap = await getDoc(squadRef);
                
                if (squadSnap.exists()) {
                  const squadData = squadSnap.data();
                  const newSquadScore = (squadData.totalScore || 0) + score;
                  
                  await updateDoc(squadRef, {
                    totalScore: newSquadScore
                  });
                  
                  // Get updated squad rank and data
                  await handleSquadData(userData, userRef);
                }
              } catch (error) {
                console.error("Error updating squad score:", error);
              }
            }
            
            // Update personal stats
            setStats(prevStats => ({
              ...prevStats,
              totalScore: newTotalScore,
              quizzesCompleted: userData.quizzesCompleted || 0,
              streak: userData.streak || 0,
              maxStreak: userData.maxStreak || 0
            }));
            
            // Show success message
            toast.success(`Quiz completed! You scored ${score} points.`);
            
            if (userData.streak >= 3) {
              toast.success(`🔥 ${userData.streak} day streak! Keep it up!`, {
                icon: '🔥',
                duration: 4000
              });
            }
          }
        }
      } catch (error) {
        console.error("Error handling quiz completion:", error);
        toast.error("There was an error saving your quiz results.");
      }
    }
    
    // Reset selected quiz and refresh data
    setSelectedQuiz(null);
    fetchQuizData();
  };

  // Toggle edit squad form
  const toggleEditSquadForm = () => {
    setShowEditSquadForm(prev => !prev);
    
    // Reset squad data and image state when closing the form
    if (showEditSquadForm) {
      setSquadId(null);
      setSquadData(null);
      setPreviewImage(null);
      setIsDefaultImage(true);
    }
  };

  // Define renderSquads function before it's used
  const renderSquads = () => {
    if (loading) {
      return <div className="loading">Loading squads...</div>;
    }

    if (error) {
      return <div className="error">{error}</div>;
    }

    // Show search form if it's active
    if (showSearchForm) {
      return (
        <div className="search-squad-container">
          <h2>Search for Squads</h2>
          <div className="search-form">
            <div className="form-group">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter squad name"
                disabled={searchLoading}
              />
              <button
                className="search-button"
                onClick={handleSearchSquads}
                disabled={searchLoading || !searchTerm.trim()}
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>
            
            {searchError && <div className="error-message">{searchError}</div>}
            
            {searchResults.length > 0 && (
              <div className="search-results">
                <h3>Search Results</h3>
                <ul>
                  {searchResults.map((squad) => (
                    <li key={squad.id} className="search-result-item">
                      <div className="result-info">
                        <img 
                          src={squad.image || defaultProfileImage} 
                          alt={squad.squadName}
                          className="result-image"
                          onError={(e) => {
                            e.target.src = defaultProfileImage;
                            e.target.onerror = null;
                          }}
                        />
                        <div>
                          <h4>{squad.squadName}</h4>
                          <p>{squad.bio || "No description available."}</p>
                          <span className="member-count">
                            Members: {squad.members?.length || 0}/4
                          </span>
                        </div>
                      </div>
                      <button
                        className="join-squad-btn"
                        onClick={() => handleJoinSquad(squad.id)}
                        disabled={searchLoading || isSquadFull(squad)}
                      >
                        {isSquadFull(squad) ? "Full" : "Join"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="form-actions">
              <button
                className="cancel-button"
                onClick={toggleSearchForm}
                disabled={searchLoading}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!userSquads || userSquads.length === 0) {
      return (
        <div className="no-squads">
          <p>You haven't joined any squads yet.</p>
          <div className="squad-buttons">
            <button 
              className="create-squad-btn"
              onClick={() => setShowCreateForm(true)}
            >
              <span className="btn-icon">➕</span>
              Create Your First Squad
            </button>
            <button 
              className="search-squad-btn"
              onClick={toggleSearchForm}
            >
              <span className="btn-icon">🔍</span>
              Search for Squad
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="squads-grid">
        {userSquads.map((squad) => (
          <SquadCard
            key={squad.squadId}
            squadId={squad.squadId}
            squadData={squad}
            user={user}
            isLeader={squad.ownerId === user?.uid}
            onEdit={squad.ownerId === user?.uid ? () => handleEditSquad(squad.squadId, squad) : null}
            onDelete={squad.ownerId === user?.uid ? () => handleDeleteSquad(squad.squadId) : null}
          />
        ))}
        <div className="squad-actions">
          <button 
            className="create-squad-btn"
            onClick={() => setShowCreateForm(true)}
          >
            <span className="btn-icon">➕</span>
            Create New Squad
          </button>
          <button 
            className="search-squad-btn"
            onClick={toggleSearchForm}
          >
            <span className="btn-icon">🔍</span>
            Search for Squad
          </button>
        </div>
      </div>
    );
  };

  // Modify the renderQuizCard function to check if selectedQuiz is active
  const renderQuizCard = () => {
    // Don't render the quiz card if a quiz is already selected
    if (selectedQuiz) {
      return null;
    }

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
      // Check if the quiz is already completed
      if (quiz.alreadyCompleted) {
        return (
          <div className="daily-quiz-card completed">
            <h2>Quiz Already Completed</h2>
            <p className="quiz-description">{quiz.message || "You've already completed today's quiz. Come back tomorrow for a new challenge!"}</p>
          </div>
        );
      }
      
      return (
        <div className="daily-quiz-card">
          <h2>Today's Quiz</h2>
          <p>{quiz.title}</p>
          <p className="quiz-description">{quiz.description || "Test your knowledge with today's challenge!"}</p>
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
      <div className="daily-quiz-card">
        <h2>No Quiz Available</h2>
        <p className="quiz-description">There are no quizzes available at the moment. Please check back later.</p>
      </div>
    );
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

  // Add useEffect to fetch squads when user changes
  useEffect(() => {
    if (user) {
      fetchUserSquads();
    }
  }, [user, fetchUserSquads]);

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
              image: isDefaultImage ? defaultProfileImage : previewImage
            };
            handleUpdateSquad(squadId, updatedData);
          }}>
            <div className="image-section">
              <h3>Change Squad Image</h3>
              <div className="image-upload-container">
                <div className="squad-image-preview">
                  <img 
                    src={previewImage} 
                    alt="Squad" 
                    className="squad-image-preview"
                    onError={(e) => {
                      e.target.src = defaultProfileImage;
                      e.target.onerror = null;
                      setIsDefaultImage(true);
                    }}
                  />
                  <div className="image-upload-overlay">
                    <label htmlFor="squadImageUpload" className="image-upload-icon" title="Change Image">
                      <span className="btn-icon">📷</span>
                    </label>
                    <input
                      type="file"
                      id="squadImageUpload"
                      accept="image/*"
                      onChange={(e) => {
                        handleImageChange(e);
                      }}
                      style={{ display: 'none' }}
                      aria-label="Change squad image"
                    />
                  </div>
                </div>
                {!isDefaultImage && (
                  <button 
                    type="button" 
                    className="remove-image-btn" 
                    onClick={handleResetImage}
                  >
                    Reset to Default
                  </button>
                )}
              </div>
              <p className="image-instructions">Click the camera icon to change your squad image, or use the default.</p>
            </div>

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
            <div className="form-actions">
              <button type="submit" className="btn-primary">Save Changes</button>
              <button type="button" className="btn-secondary" onClick={toggleEditSquadForm}>Cancel</button>
              <button 
                type="button" 
                className="btn-danger" 
                onClick={() => handleDeleteSquad(squadId)}
              >
                Delete Squad
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Handle squad search
  const handleSearchSquads = async () => {
    if (!searchTerm.trim()) {
      setSearchError("Please enter a squad name to search");
      return;
    }
    
    setSearchLoading(true);
    setSearchError(null);
    
    try {
      const results = await searchSquads(searchTerm);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError("No squads found matching your search");
      }
    } catch (err) {
      console.error("❌ Error searching squads:", err);
      setSearchError(err.message || "Failed to search squads. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle joining a squad
  const handleJoinSquad = async (squadIdToJoin) => {
    if (!user) {
      toast.error("You must be logged in to join a squad");
      return;
    }
    
    // Check if user is already in a squad
    if (squadId) {
      toast.error("You are already in a squad. Leave your current squad first.");
      return;
    }
    
    setSearchLoading(true);
    setSearchError(null);
    
    try {
      console.log(`Attempting to join squad: ${squadIdToJoin}`);
      
      // Try to join the squad with retries
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await joinSquad(user.uid, squadIdToJoin);
          toast.success("You have joined the squad!");
          
          // Close the search form and refresh data
          setShowSearchForm(false);
          setSearchTerm('');
          setSearchResults([]);
          await fetchUserData();
          await fetchUserSquads();
          return;
        } catch (error) {
          console.log(`Join attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          
          // Wait before retrying
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error; // Throw the last error if all retries failed
          }
        }
      }
    } catch (err) {
      console.error("❌ Error joining squad:", err);
      
      // Show a user-friendly error message
      let errorMessage = "Failed to join squad. Please try again.";
      
      if (err.message) {
        if (err.message.includes("already in a squad")) {
          errorMessage = "You are already in a squad. Leave your current squad first.";
        } else if (err.message.includes("Squad is full")) {
          errorMessage = "This squad is already full (maximum 4 members).";
        } else if (err.message.includes("Permission denied")) {
          errorMessage = "Permission denied. Please try refreshing the page and trying again.";
        } else if (err.message.includes("already in this squad")) {
          errorMessage = "You are already a member of this squad.";
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
      setSearchError(errorMessage);
    } finally {
      setSearchLoading(false);
    }
  };

  // Toggle search form
  const toggleSearchForm = () => {
    setShowSearchForm(prev => !prev);
    if (showSearchForm) {
      // Reset search state when closing the form
      setSearchTerm('');
      setSearchResults([]);
      setSearchError(null);
    }
  };

  // Helper function to get member count
  const getMemberCount = (squad) => {
    if (!squad || !squad.members) return 0;
    return Object.keys(squad.members).filter(key => squad.members[key] === true).length;
  };

  // Helper function to check if a squad is full
  const isSquadFull = (squad) => {
    return getMemberCount(squad) >= 4;
  };

  // Render quiz component or dashboard
  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        <div className="dashboard-left">
          {showCreateForm ? (
            <SquadCard
              user={user}
              onCreate={handleCreateSquad}
              onCancel={() => setShowCreateForm(false)}
            />
          ) : (
            renderSquads()
          )}
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
            <div className="stat">
              <div className="label">Total Score</div>
              <div className="value">{stats.totalScore}</div>
            </div>
            <div className="stat">
              <div className="label">Quizzes Completed</div>
              <div className="value">{stats.quizzesCompleted}</div>
            </div>
            <div className="stat">
              <div className="label">Squad Rank</div>
              <div className="value">
                {squadId ? (
                  <div className="squad-stats">
                    <div className="squad-rank">#{stats.rank}</div>
                    <div className="squad-score">Score: {stats.squadScore || 0}</div>
                  </div>
                ) : (
                  <span className="no-squad">Join a squad</span>
                )}
              </div>
            </div>
            <div 
              className={`stat streak-stat ${streakIncreased ? 'streak-increased' : ''}`} 
              data-streak={stats.streak}
              title="Complete a quiz every day to build your streak! Missing a day will reset your streak to 0."
            >
              <div className="label">Daily Streak</div>
              <div className="value streak-value">
                {stats.streak} <span className="streak-icon">🔥</span>
              </div>
              <div className="sub-label">
                Best: {stats.maxStreak}
                {stats.streak === 0 && <span className="streak-broken"> (Streak broken)</span>}
              </div>
            </div>
          </div>

          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="dashboard-right">
          <Leaderboard userId={user?.uid} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

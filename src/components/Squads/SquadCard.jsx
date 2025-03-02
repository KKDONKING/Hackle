import React, { useState, useEffect, useCallback } from "react";
import { getSquadById, updateSquad, searchSquads, joinSquad } from "../../firebase/squadService";
import { doc, getDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import "./SquadCard.css";

const SquadCard = ({ squadId, isLeader, user, onCreate, onEdit, onDelete, squadData: propSquadData, loading: propLoading, error: propError }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [mode, setMode] = useState('create'); // 'create', 'search', or 'delete'
    const [newSquad, setNewSquad] = useState({ name: "", bio: "", image: "" });
    const [squad, setSquad] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [memberUsernames, setMemberUsernames] = useState({});
    const [searchResults, setSearchResults] = useState([]);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    // Define fetchSquadData with useCallback to prevent infinite re-renders
    const fetchSquadData = useCallback(async () => {
        if (!squadId) return;
        
        setLoading(true);
        setError("");
        
        try {
            console.log("🔄 Fetching squad data for ID:", squadId);
            const squadData = await getSquadById(squadId);
            console.log("✅ Squad data fetched:", squadData);
            setSquad(squadData);
            setError("");

            // Fetch usernames for all members
            const usernames = {};
            for (const memberId of squadData.members) {
                try {
                    const userRef = doc(db, "users", memberId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        usernames[memberId] = userSnap.data().username || "Unknown User";
                    } else {
                        usernames[memberId] = "Unknown User";
                    }
                } catch (err) {
                    console.error("❌ Error fetching username for:", memberId, err);
                    usernames[memberId] = "Unknown User";
                }
            }
            setMemberUsernames(usernames);
        } catch (err) {
            console.error("❌ Error fetching squad:", err);
            setError(err.message || "Failed to load squad data. Please try again later.");
            setSquad(null);
        } finally {
            setLoading(false);
        }
    }, [squadId, setLoading, setError, setSquad, setMemberUsernames]);

    useEffect(() => {
        // Only fetch if we have a squadId and haven't exceeded retry limit
        if (squadId && retryCount < 3) {
            fetchSquadData();
        }
    }, [squadId, retryCount, fetchSquadData]);

    useEffect(() => {
        if (propSquadData) {
            setSquad(propSquadData);
            setError(propError || "");
            setLoading(propLoading || false);
        } else if (squadId) {
            fetchSquadData();
        }
    }, [squadId, propSquadData, propError, propLoading, fetchSquadData]);

    const openModal = (newMode = 'create') => {
        setMode(newMode);
        setIsEditMode(newMode === 'edit');
        if (newMode === 'edit' && squad) {
            setNewSquad({
                name: squad.squadName,
                bio: squad.bio || "",
                image: squad.image || ""
            });
        } else {
            setNewSquad({ name: "", bio: "", image: "" });
            setSearchResults([]);
        }
        setIsModalOpen(true);
        setError("");
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewSquad({ name: "", bio: "", image: "" });
        setError("");
        setIsEditMode(false);
        setSearchResults([]);
    };

    const handleSearch = async () => {
        if (!newSquad.name.trim()) {
            setError("Please enter a squad name to search");
            return;
        }
        
        setLoading(true);
        setError("");
        
        try {
            const results = await searchSquads(newSquad.name);
            setSearchResults(results);
            if (results.length === 0) {
                setError("No squads found matching your search");
            }
        } catch (err) {
            console.error("❌ Error searching squads:", err);
            setError("Failed to search squads. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinSquad = async (squadIdToJoin) => {
        setLoading(true);
        setError("");
        
        try {
            await joinSquad(user.uid, squadIdToJoin);
            window.location.reload(); // Refresh to update the squad state
        } catch (err) {
            console.error("❌ Error joining squad:", err);
            setError(err.message || "Failed to join squad. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handle form submission for both create and edit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newSquad.name.trim()) {
            setError("Squad name is required");
            return;
        }
        
        setLoading(true);
        setError("");
        
        try {
            if (isEditMode) {
                console.log("🔄 Updating squad:", newSquad);
                const updatedSquad = await updateSquad(squadId, user.uid, newSquad);
                console.log("✅ Squad updated successfully");
                setSquad(updatedSquad);
            } else {
                console.log("🔄 Creating new squad:", newSquad);
                await onCreate(newSquad);
                console.log("✅ Squad created successfully");
            }
        closeModal();
        } catch (err) {
            console.error(`❌ Error ${isEditMode ? 'updating' : 'creating'} squad:`, err);
            setError(err.message || `Error ${isEditMode ? 'updating' : 'creating'} squad. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    // Handle retry
    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setError("");
        setLoading(true);
    };

    // Handle delete squad function
    const handleDeleteSquad = async () => {
        if (deleteConfirmation !== squad.squadName) {
            setError("Please type the squad name correctly to confirm deletion");
            return;
        }

        if (!isLeader || user.uid !== squad.ownerId) {
            setError("Only the squad leader can delete the squad");
            return;
        }
        
        setLoading(true);
        setError("");
        
        try {
            // First check if the squad still exists and user is still the owner
            const squadRef = doc(db, "squads", squadId);
            const squadDoc = await getDoc(squadRef);
            
            if (!squadDoc.exists()) {
                throw new Error("Squad not found");
            }

            const squadData = squadDoc.data();
            if (squadData.ownerId !== user.uid) {
                throw new Error("You are no longer the squad leader");
            }

            // Create a new batch
            const batch = writeBatch(db);
            
            // Update all member users to remove the squad reference
            const members = squadData.members || [];
            
            // Add each member update to the batch
            for (const memberId of members) {
                const userRef = doc(db, "users", memberId);
                const userDoc = await getDoc(userRef);
                
                if (userDoc.exists()) {
                    // Only update if the user's squadId matches this squad
                    const userData = userDoc.data();
                    if (userData.squadId === squadId) {
                        batch.update(userRef, {
                            squadId: null
                        });
                    }
                }
            }

            // Add squad deletion to the batch
            batch.delete(squadRef);

            // Commit the batch
            await batch.commit();
            
            // Redirect to home or refresh
            window.location.href = "/"; // Redirect to home instead of just reloading
        } catch (err) {
            console.error("❌ Error deleting squad:", err);
            if (err.code === "permission-denied") {
                setError("You don't have permission to delete this squad. Please make sure you are the squad leader.");
            } else {
                setError(err.message || "Failed to delete squad. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle edit squad button click
    const handleEditClick = () => {
        if (onEdit) {
            // Use the parent component's edit handler
            onEdit();
        } else {
            // Use the local edit mode
            setIsEditMode(true);
            if (squad) {
                setNewSquad({
                    name: squad.squadName,
                    bio: squad.bio || "",
                    image: squad.image || ""
                });
            }
        }
    };

    // Handle delete squad button click
    const handleDeleteClick = async () => {
        if (onDelete) {
            // Use the parent component's delete handler
            await onDelete();
        } else {
            // Use the local delete handler
            if (deleteConfirmation === squad.squadName) {
                handleDeleteSquad();
            } else {
                setError("Please type the squad name correctly to confirm deletion");
            }
        }
    };

    if (!squadId) {
        return (
            <div className="squad-card">
                <div className="no-squad">
                    <h2>No Squad Found</h2>
                    <p>You are not part of any squad. Create one or join an existing squad!</p>
                    <div className="squad-actions">
                        <button 
                            className="create-squad" 
                            onClick={() => openModal('create')}
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Squad"}
                        </button>
                        <button 
                            className="search-squad" 
                            onClick={() => openModal('search')}
                            disabled={loading}
                        >
                            Search Squads
                        </button>
                    </div>
                </div>

                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <button 
                                className="close-button" 
                                onClick={closeModal}
                                aria-label="Close modal"
                            >
                                ×
                            </button>
                            <h2>{mode === 'create' ? 'Create Squad' : 'Search Squads'}</h2>
                            {error && (
                                <div className="error-text">
                                    <p>{error}</p>
                                    <button 
                                        onClick={() => setError("")}
                                        className="clear-error"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}
                            
                            {mode === 'create' ? (
                                <form onSubmit={handleSubmit} className="edit-mode-form">
                                    <div className="form-group">
                                        <label htmlFor="squadName">Squad Name</label>
                                        <input 
                                            id="squadName"
                                            type="text" 
                                            value={newSquad.name} 
                                            onChange={(e) => setNewSquad({ ...newSquad, name: e.target.value })} 
                                            required 
                                            disabled={loading}
                                            placeholder="Enter squad name"
                                            minLength={3}
                                            maxLength={30}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="squadBio">Bio (Optional)</label>
                                        <textarea 
                                            id="squadBio"
                                            value={newSquad.bio} 
                                            onChange={(e) => setNewSquad({ ...newSquad, bio: e.target.value })} 
                                            disabled={loading}
                                            placeholder="Tell us about your squad"
                                            maxLength={200}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="squadImage">Squad Image URL (Optional)</label>
                                        <input 
                                            id="squadImage"
                                            type="text" 
                                            value={newSquad.image} 
                                            onChange={(e) => setNewSquad({ ...newSquad, image: e.target.value })} 
                                            disabled={loading}
                                            placeholder="Enter image URL"
                                        />
                                    </div>

                                    <div className="edit-buttons">
                                        <button 
                                            type="submit" 
                                            disabled={loading || !newSquad.name.trim()}
                                            className="update-button"
                                        >
                                            {loading ? "Creating..." : "Create Squad"}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={closeModal}
                                            className="cancel-button"
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="search-section edit-mode-form">
                                    <div className="form-group">
                                        <label htmlFor="searchSquadName">Squad Name</label>
                                        <div className="search-box">
                                            <input 
                                                id="searchSquadName"
                                                type="text" 
                                                value={newSquad.name} 
                                                onChange={(e) => setNewSquad({ ...newSquad, name: e.target.value })} 
                                                disabled={loading}
                                                placeholder="Enter squad name to search"
                                            />
                                            <button 
                                                onClick={handleSearch}
                                                disabled={loading}
                                                className="search-button"
                                            >
                                                {loading ? "Searching..." : "Search"}
                                            </button>
                                        </div>
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="search-results">
                                            <h3>Search Results</h3>
                                            <ul>
                                                {searchResults.map((result) => (
                                                    <li key={result.squadId} className="search-result-item">
                                                        <div className="result-info">
                                                            <h4>{result.squadName}</h4>
                                                            <p>{result.bio || "No bio available"}</p>
                                                            <span className="member-count">
                                                                Members: {result.members?.length || 0}/4
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleJoinSquad(result.squadId)}
                                                            disabled={loading || (result.members?.length || 0) >= 4}
                                                            className="join-button"
                                                        >
                                                            {(result.members?.length || 0) >= 4 ? "Full" : "Join"}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="edit-buttons">
                                        <button 
                                            type="button" 
                                            onClick={() => setMode('create')}
                                            className="update-button"
                                        >
                                            Switch to Create
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={closeModal}
                                            className="cancel-button"
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (loading || propLoading) {
        return (
            <div className="squad-card loading">
                <p>Loading squad data...</p>
            </div>
        );
    }

    if (error || propError) {
        return (
            <div className="squad-card error">
                <p>{error || propError}</p>
                <button 
                    className="retry-button"
                    onClick={handleRetry}
                    disabled={loading || retryCount >= 3}
                >
                    {retryCount >= 3 ? "Too many retries" : "Retry"}
                </button>
            </div>
        );
    }

    const currentSquad = propSquadData || squad;
    
    if (!currentSquad) {
        return null;
    }

    console.log("SquadCard rendering with:", {
        isLeader,
        squadId,
        currentSquad,
        isEditMode
    });

    return (
        <div className="squad-card">
            {!isEditMode ? (
                <>
                    <button 
                        className="floating-edit-btn"
                        onClick={handleEditClick}
                        disabled={loading}
                        aria-label="Edit Squad"
                    >
                        <span className="btn-icon">✏️</span>
                    </button>
                    {currentSquad.banner && <img src={currentSquad.banner} alt="Squad Banner" className="squad-banner" />}
                    <img 
                        src={currentSquad.image || "/default-squad.png"} 
                        alt={currentSquad.squadName} 
                        className="squad-image"
                        onError={(e) => {
                            e.target.src = "/default-squad.png";
                            e.target.onerror = null;
                        }}
                    />
                    <h2>{currentSquad.squadName}</h2>
                    <p className="squad-bio">{currentSquad.bio || "No bio available."}</p>

                    <div className="squad-members">
                        <h3>Members ({currentSquad.members?.length || 0}/4)</h3>
                        {currentSquad.members && currentSquad.members.length > 0 ? (
                            <ul>
                                {currentSquad.members.map((memberId, index) => (
                                    <li key={index}>
                                        {memberUsernames[memberId] || "Loading..."} 
                                        {memberId === currentSquad.ownerId && " (Leader)"}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No members yet.</p>
                        )}
                    </div>

                    <div className="squad-actions">
                        <button 
                            className="edit-squad-btn"
                            onClick={handleEditClick}
                            disabled={loading}
                            aria-label="Edit Squad"
                        >
                            <span className="btn-icon">✏️</span>
                            Edit Squad
                        </button>
                        {onDelete && (
                            <button 
                                className="delete-squad"
                                onClick={handleDeleteClick}
                                disabled={loading}
                            >
                                <span className="btn-icon">🗑️</span>
                                Delete Squad
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="edit-mode">
                    <h2>Edit Squad</h2>
                    {error && <p className="error-text">{error}</p>}
                    <form onSubmit={handleSubmit} className="edit-mode-form">
                        <div className="form-group">
                            <label htmlFor="editSquadName">Squad Name</label>
                            <input 
                                id="editSquadName"
                                type="text" 
                                value={newSquad.name} 
                                onChange={(e) => setNewSquad({ ...newSquad, name: e.target.value })} 
                                required 
                                disabled={loading}
                                placeholder="Enter squad name"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="editSquadBio">Bio (Optional)</label>
                            <textarea 
                                id="editSquadBio"
                                value={newSquad.bio} 
                                onChange={(e) => setNewSquad({ ...newSquad, bio: e.target.value })} 
                                disabled={loading}
                                placeholder="Tell us about your squad"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="editSquadImage">Squad Image URL (Optional)</label>
                            <input 
                                id="editSquadImage"
                                type="text" 
                                value={newSquad.image} 
                                onChange={(e) => setNewSquad({ ...newSquad, image: e.target.value })} 
                                disabled={loading}
                                placeholder="Enter image URL"
                            />
                        </div>

                        <div className="edit-buttons">
                            <button 
                                type="submit"
                                disabled={loading}
                                className="update-button"
                            >
                                {loading ? "Updating..." : "Update Squad"}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setIsEditMode(false);
                                    setError("");
                                    setDeleteConfirmation("");
                                }}
                                disabled={loading}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>

                    <div className="delete-section">
                        <h3>Danger Zone</h3>
                        <p className="warning-text">
                            ⚠️ Deleting your squad cannot be undone. All squad data will be permanently removed.
                        </p>
                        <div className="delete-confirmation-section">
                            <p className="confirmation-text">
                                Type <strong>{currentSquad.squadName}</strong> to confirm deletion:
                            </p>
                            <div className="delete-confirmation-box">
                                <input 
                                    type="text"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder="Type squad name to confirm"
                                    className="delete-confirmation-input"
                                />
                                <button 
                                    className="delete-confirm-button"
                                    onClick={handleDeleteClick}
                                    disabled={loading || deleteConfirmation !== currentSquad.squadName}
                                >
                                    {loading ? "Deleting..." : "Delete Squad"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SquadCard;

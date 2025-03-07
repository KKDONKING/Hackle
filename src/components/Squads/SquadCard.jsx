import React, { useState, useEffect, useCallback } from "react";
import { getSquadById, updateSquad, searchSquads, joinSquad, leaveSquad, deleteSquad } from "../../firebase/squadService";
import { doc, getDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import "./SquadCard.css";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
// Import the default profile image
import defaultProfileImage from "../../assets/pfp.png";

const SquadCard = ({ squadId, isLeader, user, onCreate, onEdit, onDelete, onCancel, squadData: propSquadData, loading: propLoading, error: propError }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [mode, setMode] = useState('create'); // 'create', 'search', or 'delete'
    const [newSquad, setNewSquad] = useState({
        name: propSquadData?.squadName || '',
        bio: propSquadData?.bio || '',
        image: propSquadData?.image || defaultProfileImage
    });
    const [squad, setSquad] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [memberUsernames, setMemberUsernames] = useState({});
    const [searchResults, setSearchResults] = useState([]);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [deleteSuccess, setDeleteSuccess] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const navigate = useNavigate();

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

    // Add console log to debug props
    useEffect(() => {
        console.log("SquadCard props:", {
            squadId,
            isLeader,
            user,
            propSquadData,
            propLoading,
            propError
        });
    }, [squadId, isLeader, user, propSquadData, propLoading, propError]);

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
            // Check if the squad already has 4 members
            const squadToJoin = await getSquadById(squadIdToJoin);
            if (squadToJoin.members && squadToJoin.members.length >= 4) {
                throw new Error("This squad is already full (maximum 4 members)");
            }
            
            await joinSquad(user.uid, squadIdToJoin);
            toast.success("You have joined the squad!");
            
            // Update local state without page refresh
            if (squadId === squadIdToJoin) {
                fetchSquadData();
            } else {
                // If not the current squad, redirect or refresh
                window.location.reload();
            }
        } catch (err) {
            console.error("❌ Error joining squad:", err);
            setError(err.message || "Failed to join squad. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handle image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.match('image.*')) {
                setError("Please select an image file");
                return;
            }
            
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                setError("Image size should be less than 2MB");
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewSquad({
                    ...newSquad,
                    image: reader.result
                });
            };
            reader.onerror = () => {
                setError("Failed to read the image file");
                // Set to default image on error
                setNewSquad({
                    ...newSquad,
                    image: defaultProfileImage
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle image removal
    const handleRemoveImage = () => {
        setNewSquad({
            ...newSquad,
            image: defaultProfileImage // Set to default image
        });
    };

    // Handle form submission for both create and edit
    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = newSquad.name.trim();
        
        // Validate squad name
        if (!trimmedName) {
            setError("Squad name is required");
            return;
        }
        
        if (trimmedName.length < 3) {
            setError("Squad name must be at least 3 characters long");
            return;
        }
        
        if (trimmedName.length > 30) {
            setError("Squad name must be less than 30 characters");
            return;
        }
        
        setLoading(true);
        setError("");
        
        try {
            // Ensure image is set to default if none provided
            const imageToUse = newSquad.image || defaultProfileImage;
            
            if (isEditMode && squadId) {
                // Update existing squad
                const updateData = {
                    squadName: trimmedName,
                    bio: newSquad.bio?.trim() || '',
                    image: imageToUse,
                    lastUpdated: new Date().toISOString()
                };
                
                console.log("🔄 Updating squad with data:", updateData);
                
                const updatedSquad = await updateSquad(user.uid, squadId, updateData);
                toast.success("Squad updated successfully!");
                
                // Update local state without page refresh
                setSquad({
                    ...squad,
                    ...updatedSquad
                });
                
                setIsEditMode(false);
            } else {
                // Create new squad
                const squadData = {
                    squadName: trimmedName,
                    bio: newSquad.bio?.trim() || '',
                    members: [user.uid],
                    createdAt: new Date().toISOString(),
                    image: imageToUse,
                    banner: null
                };

                console.log("🔄 Creating squad with data:", squadData);

                if (onCreate) {
                    const newSquadId = await onCreate(squadData);
                    toast.success("Squad created successfully!");
                    
                    // If we have a new squad ID, we could redirect to it
                    // or just close the modal and let the parent component handle it
                    setIsModalOpen(false);
                    
                    if (onCancel) {
                        onCancel();
                    }
                } else {
                    throw new Error("Create squad handler not provided");
                }
            }
        } catch (err) {
            console.error("❌ Error updating/creating squad:", err);
            setError(err.message || "Failed to update/create squad. Please try again.");
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
    const handleDeleteConfirm = async () => {
        if (!squad && !propSquadData) {
            setDeleteError("No squad data found");
            return;
        }

        const squadToDelete = squad || propSquadData;

        setIsDeleting(true);
        setDeleteError(null);
        
        try {
            if (onDelete) {
                // Use the prop function if provided
                await onDelete(squadToDelete.squadId);
                toast.success("Squad deleted successfully!");
                setShowDeleteConfirm(false);
            } else {
                // Use the service function directly
                await deleteSquad(user.uid, squadToDelete.squadId);
                toast.success("Squad deleted successfully!");
                setShowDeleteConfirm(false);
                
                // Navigate without full page refresh
                navigate("/squads", { replace: true });
            }
        } catch (error) {
            console.error("Error deleting squad:", error);
            setDeleteError(error.message || "Failed to delete squad");
            toast.error(error.message || "Failed to delete squad");
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle delete squad button click
    const handleDeleteClick = async () => {
        const squadToDelete = squad || propSquadData;
        
        if (!squadToDelete) {
            setDeleteError("No squad data found");
            return;
        }
        
        if (deleteConfirmation === squadToDelete.squadName) {
            await handleDeleteConfirm();
        } else {
            setDeleteError("Please type the squad name correctly to confirm deletion");
            toast.error("Please type the squad name correctly to confirm deletion");
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
            if (currentSquad) {
                setNewSquad({
                    name: currentSquad.squadName || "",
                    bio: currentSquad.bio || "",
                    image: currentSquad.image || defaultProfileImage
                });
            }
            // Reset any errors or confirmation
            setError("");
            setDeleteConfirmation("");
        }
    };

    // Handle leave squad
    const handleLeaveSquad = async (squadIdToLeave) => {
        setLoading(true);
        setError("");
        
        try {
            await leaveSquad(user.uid, squadIdToLeave);
            toast.success("You have left the squad");
            // Refresh the page to update UI
            window.location.reload();
        } catch (err) {
            console.error("❌ Error leaving squad:", err);
            setError(err.message || "Failed to leave squad. Please try again.");
            setLoading(false);
        }
    };

    if (!squadId) {
        return (
            <div className="squad-card">
                <div className="no-squad">
                    <h2>Create New Squad</h2>
                    <form onSubmit={handleSubmit} className="edit-mode-form">
                        <div className="image-section">
                            <h3>Squad Image</h3>
                            <div className="image-upload-container">
                                <div className="squad-image-preview">
                                    <img 
                                        src={newSquad.image || defaultProfileImage} 
                                        alt="Squad" 
                                        className="squad-image-preview"
                                    />
                                    <div className="image-upload-overlay">
                                        <label htmlFor="createSquadImageUpload" className="image-upload-icon" title="Upload Image">
                                            <span className="btn-icon">📷</span>
                                        </label>
                                        <input
                                            type="file"
                                            id="createSquadImageUpload"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            style={{ display: 'none' }}
                                            aria-label="Upload squad image"
                                        />
                                    </div>
                                </div>
                                {newSquad.image && newSquad.image !== defaultProfileImage && (
                                    <button 
                                        type="button" 
                                        className="remove-image-btn" 
                                        onClick={handleRemoveImage}
                                    >
                                        Reset to Default
                                    </button>
                                )}
                            </div>
                            <p className="image-instructions">Click the camera icon to upload a custom image, or use the default.</p>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="squadName">Squad Name *</label>
                            <input
                                type="text"
                                id="squadName"
                                name="name"
                                value={newSquad.name}
                                onChange={(e) => setNewSquad({ ...newSquad, name: e.target.value })}
                                placeholder="Enter squad name"
                                required
                                minLength={3}
                                maxLength={30}
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="bio">Bio (Optional)</label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={newSquad.bio}
                                onChange={(e) => setNewSquad({ ...newSquad, bio: e.target.value })}
                                placeholder="Enter squad description"
                                maxLength={500}
                                disabled={loading}
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <div className="edit-buttons">
                            <button
                                type="submit"
                                className="update-button"
                                disabled={loading || !newSquad.name.trim()}
                            >
                                {loading ? "Creating..." : "Create Squad"}
                            </button>
                            <button
                                type="button"
                                className="cancel-button"
                                onClick={() => {
                                    if (onCancel) {
                                        onCancel();
                                    } else {
                                        closeModal();
                                    }
                                }}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
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
        console.log("No squad data available");
        return null;
    }

    console.log("SquadCard rendering with:", {
        isLeader,
        squadId,
        currentSquad,
        isEditMode
    });

    if (isEditMode) {
        return (
            <div className="squad-card">
                <div className="edit-mode">
                    <h2>Edit Squad</h2>
                    {error && <p className="error-text">{error}</p>}
                    <form onSubmit={handleSubmit} className="edit-mode-form">
                        <div className="image-section">
                            <h3>Change Squad Image</h3>
                            <div className="image-upload-container">
                                <div className="squad-image-preview">
                                    <img 
                                        src={newSquad.image || defaultProfileImage} 
                                        alt="Squad" 
                                        className="squad-image-preview"
                                    />
                                    <div className="image-upload-overlay">
                                        <label htmlFor="squadImageUpload" className="image-upload-icon" title="Change Image">
                                            <span className="btn-icon">📷</span>
                                        </label>
                                        <input
                                            type="file"
                                            id="squadImageUpload"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            style={{ display: 'none' }}
                                            aria-label="Change squad image"
                                        />
                                    </div>
                                </div>
                                {newSquad.image && newSquad.image !== defaultProfileImage && (
                                    <button 
                                        type="button" 
                                        className="remove-image-btn" 
                                        onClick={handleRemoveImage}
                                    >
                                        Reset to Default
                                    </button>
                                )}
                            </div>
                            <p className="image-instructions">Click the camera icon to change your squad image, or use the default.</p>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="squadName">Squad Name *</label>
                            <input 
                                type="text" 
                                id="squadName"
                                name="name"
                                value={newSquad.name} 
                                onChange={(e) => setNewSquad({ ...newSquad, name: e.target.value })} 
                                placeholder="Enter squad name"
                                required 
                                minLength={3}
                                maxLength={30}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="bio">Description (Optional)</label>
                            <textarea 
                                id="bio"
                                name="bio"
                                value={newSquad.bio} 
                                onChange={(e) => setNewSquad({ ...newSquad, bio: e.target.value })} 
                                placeholder="Enter squad description"
                                maxLength={500}
                                disabled={loading}
                            />
                        </div>
                        
                        {error && <div className="error-message">{error}</div>}
                        
                        <div className="edit-buttons">
                            <button
                                type="submit"
                                className="update-button"
                                disabled={loading || !newSquad.name.trim()}
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
                                className="cancel-button"
                                disabled={loading}
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
                        <button 
                            className="delete-squad-btn"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={loading}
                        >
                            <span className="btn-icon">🗑️</span>
                            Delete Squad
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="squad-card">
            {!isEditMode ? (
                <>
                    {currentSquad.banner && <img src={currentSquad.banner} alt="Squad Banner" className="squad-banner" />}
                    <img 
                        src={currentSquad.image || defaultProfileImage} 
                        alt={currentSquad.squadName} 
                        className="squad-image"
                        onError={(e) => {
                            e.target.src = defaultProfileImage;
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
                        {isLeader && (
                            <button 
                                className="edit-squad-btn"
                                onClick={handleEditClick}
                                disabled={loading}
                                aria-label="Edit Squad"
                            >
                                <span className="btn-icon">✏️</span>
                                Edit Squad
                            </button>
                        )}
                        {!isLeader && currentSquad.members && currentSquad.members.includes(user?.uid) && (
                            <button 
                                className="leave-squad-btn"
                                onClick={() => handleLeaveSquad(currentSquad.squadId)}
                                disabled={loading}
                            >
                                <span className="btn-icon">🚪</span>
                                Leave Squad
                            </button>
                        )}
                    </div>
                </>
            ) : (
                null
            )}

            {showDeleteConfirm && (
                <div className="delete-confirmation-modal">
                    <h3>Delete Squad</h3>
                    <p>Are you sure you want to delete this squad? This action cannot be undone.</p>
                    <p>Type <strong>{currentSquad?.squadName}</strong> to confirm:</p>
                    <input
                        type="text"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Type squad name to confirm"
                    />
                    {deleteError && <div className="error-message">{deleteError}</div>}
                    <div className="delete-buttons">
                        <button
                            className="confirm-delete-button"
                            onClick={handleDeleteClick}
                            disabled={isDeleting || deleteConfirmation !== currentSquad?.squadName}
                        >
                            {isDeleting ? "Deleting..." : "Delete Squad"}
                        </button>
                        <button
                            className="cancel-delete-button"
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteConfirmation("");
                            }}
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SquadCard;

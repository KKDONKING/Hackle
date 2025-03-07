import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Initialize collections if they don't exist
const initializeCollections = async () => {
  try {
    console.log("🔄 Initializing Firestore collections...");
    
    // Create squads collection with an initial document
    const squadsRef = collection(db, "squads");
    const initialSquadRef = doc(squadsRef, "initial_squad");
    await setDoc(initialSquadRef, {
      squadId: "initial_squad",
      squadName: "Initial Squad",
      bio: "This is the initial squad document to create the collection.",
      members: [],
      totalScore: 0,
      createdAt: new Date().toISOString(),
      ownerId: "system",
      lastUpdated: new Date().toISOString(),
      _isInitial: true
    });
    
    console.log("✅ Squads collection initialized");
    
    // Create users collection if it doesn't exist
    const usersRef = collection(db, "users");
    const initialUserRef = doc(usersRef, "initial_user");
    await setDoc(initialUserRef, {
      userId: "initial_user",
      username: "System",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      _isInitial: true
    });
    
    console.log("✅ Users collection initialized");
    
    // Clean up initial documents after a short delay
    setTimeout(async () => {
      try {
        await deleteDoc(initialSquadRef);
        await deleteDoc(initialUserRef);
        console.log("✅ Initial documents cleaned up");
      } catch (error) {
        console.error("⚠️ Error cleaning up initial documents:", error);
      }
    }, 5000);
  } catch (error) {
    console.error("❌ Error initializing collections:", error);
    throw new Error("Failed to initialize Firestore collections: " + error.message);
  }
};

// Helper function to ensure collections exist
const ensureCollections = async () => {
  try {
    // Try to access the squads collection
  const squadsRef = collection(db, "squads");
    const squadQuery = query(squadsRef, where("_isInitial", "==", true));
    const squadSnap = await getDocs(squadQuery);
    
    // If no documents exist, initialize collections
    if (squadSnap.empty) {
      console.log("⚠️ Collections not found, initializing...");
      await initializeCollections();
    }
  } catch (error) {
    console.error("❌ Error checking collections:", error);
    if (error.code === 'permission-denied') {
      throw new Error("You don't have permission to access the squads collection. Please check your Firebase security rules.");
    } else if (error.code === 'not-found') {
      await initializeCollections();
    } else {
      throw error;
    }
  }
};

// Helper function to normalize squad ID format
const normalizeSquadId = (rawId) => {
  if (!rawId) return null;
  
  // If it's already in the new format, return as is
  if (rawId.startsWith('squad_')) {
    return rawId;
  }
  
  // Convert old format to new format
  const [timestamp, randomPart] = rawId.split('-');
  if (timestamp && randomPart) {
    return `squad_${timestamp}_${randomPart}`;
  }
  
  // If we can't parse it, return the original
  return rawId;
};

// 🏆 Create a Squad
export const createSquad = async (userId, squadData) => {
    try {
        console.log("🔄 Starting squad creation process...");
        console.log("📝 Input data:", { userId, squadData });

        // Validate required fields
        if (!userId) {
            throw new Error("User ID is required");
        }

        if (!squadData || !squadData.squadName || !squadData.squadName.trim()) {
            throw new Error("Squad name is required");
        }

        // Create the squad document
        const squadRef = doc(collection(db, "squads"));
        const squadId = squadRef.id;

        // Prepare squad data
        const newSquad = {
            ...squadData,
            squadId,
            ownerId: userId,
            members: [userId],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        // Save to Firestore
        await setDoc(squadRef, newSquad);

        console.log("✅ Squad created successfully with ID:", squadId);
        return squadId;
    } catch (error) {
        console.error("❌ Error in createSquad:", error);
        throw error;
    }
};

// 🔍 Get Squad by ID
export const getSquadById = async (squadId) => {
  try {
    if (!squadId) {
      throw new Error("Squad ID is required");
    }

    console.log("🔍 Fetching squad:", squadId);
    
    // Try with normalized ID first
    const normalizedId = normalizeSquadId(squadId);
    console.log("🔄 Normalized squad ID:", normalizedId);
    
    // Try both the original and normalized IDs
    const attempts = [squadId];
    if (normalizedId !== squadId) {
      attempts.push(normalizedId);
    }

    let squadData = null;
    let lastError = null;

    for (const id of attempts) {
      try {
        const squadRef = doc(db, "squads", id);
        const squadSnap = await getDoc(squadRef);

        if (squadSnap.exists()) {
          squadData = { id: squadSnap.id, ...squadSnap.data() };
          console.log("✅ Squad found:", squadData);
          
          // If we found it with the normalized ID but it's different from the original,
          // update the user's reference to use the normalized ID
          if (id === normalizedId && id !== squadId) {
            console.log("🔄 Updating squad reference to normalized ID...");
            const usersRef = collection(db, "users");
            const userQuery = query(usersRef, where("squadId", "==", squadId));
            const userSnaps = await getDocs(userQuery);
            
            for (const userDoc of userSnaps.docs) {
              await updateDoc(doc(db, "users", userDoc.id), {
                squadId: normalizedId,
                lastUpdated: new Date().toISOString()
              });
            }
          }
          
          return squadData;
        }
      } catch (error) {
        lastError = error;
        console.error(`❌ Error fetching squad with ID ${id}:`, error);
      }
    }

    // If we get here, no squad was found with either ID
    console.error("❌ Squad not found:", squadId);
    throw new Error("Squad not found");
  } catch (error) {
    console.error("❌ Error fetching squad:", error);
    throw error;
  }
};

// 🔍 Search Squads by Name or ID
export const searchSquads = async (searchTerm) => {
  try {
    console.log("🔍 Searching for squads with term:", searchTerm);
  const squadsRef = collection(db, "squads");
    
    // Convert search term to lowercase for case-insensitive search
    const searchTermLower = searchTerm.toLowerCase();
    
    // Get all squads and filter client-side for better partial matching
    const squadsSnap = await getDocs(squadsRef);
    
    const results = squadsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(squad => {
        // Check if squad name contains search term (case-insensitive)
        const squadNameLower = squad.squadName.toLowerCase();
        return squadNameLower.includes(searchTermLower);
      })
      // Limit to 10 results for performance
      .slice(0, 10);
    
    console.log("✅ Found squads:", results.length);
    return results;
  } catch (error) {
    console.error("❌ Error searching squads:", error);
    throw new Error("Failed to search squads. Please try again.");
  }
};

// 🔥 Join a Squad
export const joinSquad = async (userId, squadId) => {
    if (!userId || !squadId) {
        throw new Error("User ID and Squad ID are required");
    }

    try {
        // Get the squad document
        const squadRef = doc(db, "squads", squadId);
        const squadDoc = await getDoc(squadRef);

        if (!squadDoc.exists()) {
            throw new Error("Squad not found");
        }

        const squadData = squadDoc.data();
        
        // Check if the squad is full (maximum 4 members)
        if (squadData.members && squadData.members.length >= 4) {
            throw new Error("Squad is full (maximum 4 members)");
        }

        // Check if user is already in a squad
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error("User not found");
        }

        const userData = userDoc.data();
        
        if (userData.squadId) {
            throw new Error("You are already in a squad. Leave your current squad first.");
        }

        // Check if user is already in this squad
        if (squadData.members && squadData.members.includes(userId)) {
            throw new Error("You are already in this squad");
        }

        // Update the squad document to add the user to members
        const updatedMembers = [...(squadData.members || []), userId];
        await updateDoc(squadRef, {
            members: updatedMembers,
            lastUpdated: new Date().toISOString()
        });

        // Update the user document to set the squadId
        await updateDoc(userRef, {
            squadId: squadId,
            lastUpdated: new Date().toISOString()
        });

        console.log("✅ User joined squad successfully");
        return true;
    } catch (error) {
        console.error("❌ Error joining squad:", error);
        throw error;
    }
};

// 👋 Leave Squad
export const leaveSquad = async (userId, squadId) => {
    if (!userId || !squadId) {
        throw new Error("User ID and Squad ID are required");
    }

    try {
        const squadRef = doc(db, "squads", squadId);
        const squadSnap = await getDoc(squadRef);

        if (!squadSnap.exists()) throw new Error("Squad not found");
        
        const squadData = squadSnap.data();
        
        // Check if user is in the squad
        if (!squadData.members || !squadData.members.includes(userId)) {
            throw new Error("You are not a member of this squad");
        }
        
        // Check if user is the owner
        if (squadData.ownerId === userId) {
            throw new Error("Squad leaders cannot leave their squad. You must delete the squad or transfer leadership first.");
        }
        
        // Update the squad document to remove the user from members
        const updatedMembers = squadData.members.filter(id => id !== userId);
        await updateDoc(squadRef, {
            members: updatedMembers,
            lastUpdated: new Date().toISOString()
        });
        
        // Update the user document to remove the squadId
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            squadId: null,
            lastUpdated: new Date().toISOString()
        });
        
        console.log("✅ User left squad successfully");
        return true;
    } catch (error) {
        console.error("❌ Error leaving squad:", error);
        throw error;
    }
};

// 🗑️ Delete Squad
export const deleteSquad = async (userId, squadId) => {
  try {
    console.log("🔄 Attempting to delete squad:", squadId);
    
    // Verify the squad exists
    const squadRef = doc(db, "squads", squadId);
    const squadSnap = await getDoc(squadRef);
    
    if (!squadSnap.exists()) {
      throw new Error("Squad not found");
    }
    
    const squadData = squadSnap.data();
    
    // Verify the user is the squad owner
    if (squadData.ownerId !== userId) {
      throw new Error("Only the squad leader can delete the squad");
    }
    
    console.log("✅ User verified as squad owner");
    
    // Get all members of the squad
    const members = squadData.members || [];
    console.log(`🔄 Updating ${members.length} squad members...`);
    
    // Update all member users to remove the squad reference
    for (const memberId of members) {
      try {
        const userRef = doc(db, "users", memberId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Only update if the user's squadId matches this squad
          if (userData.squadId === squadId) {
            console.log(`🔄 Removing squad reference for user: ${memberId}`);
            await updateDoc(userRef, {
              squadId: null,
              role: null,
              lastUpdated: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error(`❌ Error updating member ${memberId}:`, err);
        // Continue with other members even if one fails
      }
    }
    
    // Delete the squad document
    console.log("🗑️ Deleting squad document...");
    await deleteDoc(squadRef);
    
    console.log("✅ Squad deleted successfully");
    return true;
  } catch (error) {
    console.error("❌ Error deleting squad:", error);
    throw error;
  }
};

// 📝 Update Squad
export const updateSquad = async (userId, squadId, updateData) => {
  try {
    console.log("🔄 Updating squad:", squadId);
    
    if (!squadId || !userId) {
      throw new Error("Squad ID and User ID are required");
    }
    
    // Verify the squad exists
    const squadRef = doc(db, "squads", squadId);
    const squadSnap = await getDoc(squadRef);
    
    if (!squadSnap.exists()) {
      throw new Error("Squad not found");
    }
    
    const squadData = squadSnap.data();
    
    // Verify the user is the squad owner
    if (squadData.ownerId !== userId) {
      throw new Error("Only the squad leader can update the squad");
    }
    
    // Validate update data
    if (!updateData || typeof updateData !== 'object') {
      throw new Error("Invalid update data");
    }
    
    // Prepare the update object
    const updateObj = {
      ...updateData,
      lastUpdated: new Date().toISOString()
    };
    
    // Update the squad document
    await updateDoc(squadRef, updateObj);
    
    console.log("✅ Squad updated successfully");
    
    // Get the updated squad data
    const updatedSquadSnap = await getDoc(squadRef);
    return updatedSquadSnap.data();
  } catch (error) {
    console.error("❌ Error updating squad:", error);
    throw error;
  }
};

// 👥 Get User Squads
export const getUserSquads = async (userId) => {
  try {
    console.log("🔄 Fetching squads for user:", userId);
    
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    // First check if the user is in a squad
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log("⚠️ User document not found");
      return [];
    }
    
    const userData = userDoc.data();
    const userSquadId = userData.squadId;
    
    // If user has no squad, return empty array
    if (!userSquadId) {
      console.log("ℹ️ User is not in any squad");
      return [];
    }
    
    // Get the squad document
    const squadRef = doc(db, "squads", userSquadId);
    const squadDoc = await getDoc(squadRef);
    
    if (!squadDoc.exists()) {
      console.log("⚠️ Squad document not found, but user has squadId reference");
      // Clean up the user's squadId since the squad doesn't exist
      await updateDoc(userRef, { squadId: null, role: null });
      return [];
    }
    
    const squadData = squadDoc.data();
    console.log("✅ Found squad for user:", squadData.squadName);
    
    // Return as an array for consistency
    return [squadData];
  } catch (error) {
    console.error("❌ Error fetching user squads:", error);
    throw error;
  }
};

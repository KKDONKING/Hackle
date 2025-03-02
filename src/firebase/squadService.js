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

    if (!userId) {
      throw new Error("User ID is required to create a squad");
    }

    // Get user document
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create user document if it doesn't exist
      await setDoc(userRef, {
        userId,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      console.log("✅ Created new user document");
    }

    const userData = userSnap.exists() ? userSnap.data() : {};
    if (userData.squadId) {
      console.log("⚠️ User already has a squad, fetching existing squad...");
      try {
        const existingSquad = await getSquadById(userData.squadId);
        if (existingSquad) {
          console.log("✅ Found existing squad:", existingSquad);
          return existingSquad;
        }
      } catch (error) {
        console.log("⚠️ Existing squad not found, proceeding with creation...");
        // Clear the stale squad reference
        await updateDoc(userRef, {
          squadId: null,
          role: null,
          lastUpdated: new Date().toISOString()
        });
      }
    }

    const squadsRef = collection(db, "squads");
    const squadName = typeof squadData === 'string' ? squadData : squadData.name;

    if (!squadName || squadName.trim() === '') {
      throw new Error("Squad name is required");
    }

    console.log("🔍 Checking for existing squad with name:", squadName);
    // Check if squad name exists
    const nameQuery = query(squadsRef, where("squadName", "==", squadName));
    const existingSquads = await getDocs(nameQuery);

    if (!existingSquads.empty) {
      console.error("❌ Squad name already exists");
      throw new Error("A squad with this name already exists!");
    }

    // Generate a unique ID for the squad
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 9);
    const squadId = `squad_${timestamp}_${randomPart}`;
    console.log("📌 Generated squad ID:", squadId);
    
    const squadRef = doc(db, "squads", squadId);
    
    // Create the squad document
    const squadDoc = {
      squadId,
      squadName,
      bio: typeof squadData === 'object' ? squadData.bio || "" : "",
      image: typeof squadData === 'object' ? squadData.image || "" : "",
      members: [userId],
      totalScore: 0,
      createdAt: new Date().toISOString(),
      ownerId: userId,
      lastUpdated: new Date().toISOString()
    };
    
    console.log("📄 Preparing squad document:", squadDoc);

    // Save the squad document
    console.log("💾 Saving squad document...");
    await setDoc(squadRef, squadDoc);
    console.log("✅ Squad document saved successfully");
    
    // Update the user's document with squad info
    console.log("🔄 Updating user document...");
    
    try {
      await updateDoc(userRef, {
        squadId,
        role: "leader",
        lastUpdated: new Date().toISOString()
      });
      console.log("✅ User document updated successfully");
    } catch (userUpdateError) {
      // If updating user fails, try to delete the squad document to maintain consistency
      console.error("❌ Failed to update user document:", userUpdateError);
      try {
        await deleteDoc(squadRef);
        console.log("🗑️ Cleaned up squad document due to user update failure");
      } catch (cleanupError) {
        console.error("❌ Failed to clean up squad document:", cleanupError);
      }
      throw new Error("Failed to update user information");
    }

    console.log("✅ Squad creation completed successfully:", squadId);
    return squadId;
  } catch (error) {
    console.error("❌ Error in createSquad:", error);
    if (error.code === 'permission-denied') {
      throw new Error("You don't have permission to create a squad. Please check your authentication status.");
    }
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
  const squadRef = doc(db, "squads", squadId);
  const squadSnap = await getDoc(squadRef);

  if (!squadSnap.exists()) throw new Error("Squad not found");
  
  const squadData = squadSnap.data();
  if (squadData.members.length >= 4) throw new Error("Squad is full");

  await updateDoc(squadRef, { members: arrayUnion(userId) });
  await updateDoc(doc(db, "users", userId), { 
    squadId,
    role: "member"
  });

  return squadId;
};

// 👋 Leave Squad
export const leaveSquad = async (userId, squadId) => {
  const squadRef = doc(db, "squads", squadId);
  const squadSnap = await getDoc(squadRef);

  if (!squadSnap.exists()) throw new Error("Squad not found");
  
  const squadData = squadSnap.data();
  if (squadData.ownerId === userId) {
    throw new Error("Squad leader cannot leave. Delete the squad instead.");
  }

  await updateDoc(squadRef, { members: arrayRemove(userId) });
  await updateDoc(doc(db, "users", userId), { 
    squadId: null,
    role: null
  });
};

// 📝 Update Squad
export const updateSquad = async (squadId, userId, updateData) => {
  try {
    console.log("🔄 Updating squad:", { squadId, updateData });
    
    const squadRef = doc(db, "squads", squadId);
    const squadSnap = await getDoc(squadRef);

    if (!squadSnap.exists()) {
      throw new Error("Squad not found");
    }

    const squadData = squadSnap.data();
    if (squadData.ownerId !== userId) {
      throw new Error("Only the squad leader can update the squad");
    }

    // Update only allowed fields
    const allowedUpdates = {
      squadName: updateData.name,
      bio: updateData.bio,
      image: updateData.image,
      lastUpdated: new Date().toISOString()
    };

    await updateDoc(squadRef, allowedUpdates);
    console.log("✅ Squad updated successfully");

    return { id: squadId, ...squadData, ...allowedUpdates };
  } catch (error) {
    console.error("❌ Error updating squad:", error);
    throw error;
  }
};

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebaseConfig";

// 🏆 Create a Squad (Ensuring Unique Name)
export const createSquad = async (userId, squadName) => {
  const squadsRef = collection(db, "squads");

  // Check if squad name exists
  const nameQuery = query(squadsRef, where("squadName", "==", squadName));
  const existingSquads = await getDocs(nameQuery);

  if (!existingSquads.empty) {
    throw new Error("A squad with this name already exists!");
  }

  const squadId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  const squadRef = doc(db, "squads", squadId);

  await setDoc(squadRef, {
    squadId,
    squadName,
    members: [userId],
    totalScore: 0
  });

  await updateDoc(doc(db, "users", userId), { squadId });

  return squadId;
};

// 🔍 Search Squads by Name or ID
export const searchSquads = async (searchTerm) => {
  const squadsRef = collection(db, "squads");
  const nameQuery = query(squadsRef, where("squadName", ">=", searchTerm), where("squadName", "<=", searchTerm + "\uf8ff"));
  const squadsSnap = await getDocs(nameQuery);

  return squadsSnap.docs.map(doc => doc.data());
};

// 🔥 Join a Squad
export const joinSquad = async (userId, squadId) => {
  const squadRef = doc(db, "squads", squadId);
  const squadSnap = await getDoc(squadRef);

  if (!squadSnap.exists()) throw new Error("Squad does not exist.");
  
  const squadData = squadSnap.data();
  if (squadData.members.length >= 4) throw new Error("Squad is full.");

  await updateDoc(squadRef, { members: arrayUnion(userId) });
  await updateDoc(doc(db, "users", userId), { squadId });

  return squadId;
};

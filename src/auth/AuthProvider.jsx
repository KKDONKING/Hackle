import React, { createContext, useState, useEffect } from "react";
import { auth } from "../firebase/firebase"; // Import Firebase auth
import { onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log("Auth state changed, User:", firebaseUser);
        setUser(firebaseUser);
        firebaseUser.getIdToken().then((authToken) => {
          setToken(authToken);
          localStorage.setItem("user", JSON.stringify(firebaseUser));
          localStorage.setItem("token", authToken);
        });
      } else {
        console.log("No user detected");
        setUser(null);
        setToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  const login = async (userData) => {
    setUser(userData);
    console.log("User set in context:", userData);

    const authToken = await userData.getIdToken(); // Get fresh token
    setToken(authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    auth.signOut(); // Ensure Firebase signs out
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

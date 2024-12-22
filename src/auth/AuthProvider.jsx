import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Stores authenticated user info
  const [loading, setLoading] = useState(true); // Controls loading state
  const [token, setToken] = useState(null); // Stores authentication token

  // Initialize user and token from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setLoading(false); // Set loading to false after initialization
  }, []);

  /**
   * Login function
   * Stores the user data and token in state and localStorage
   */
  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("user", JSON.stringify(userData)); // Save user info to localStorage
    localStorage.setItem("token", authToken); // Save token to localStorage
  };

  /**
   * Logout function
   * Clears user data and token from state and localStorage
   */
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  // Add value object to provide context values
  const value = {
    user,
    loading,
    token,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Add default export for AuthProvider
export default AuthProvider;

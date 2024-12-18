import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Stores authenticated user info
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Example: Fetch user info from local storage or API
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData)); // Save user to local storage
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

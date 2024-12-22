import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/" />;
  }

  // Otherwise, render the protected content
  return children;
};

export default PrivateRoute;

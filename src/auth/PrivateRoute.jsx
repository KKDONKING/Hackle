import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

const PrivateRoute = ({ component: Component }) => {
  const { user } = useContext(AuthContext);

  return user ? <Component /> : <Navigate to="/login" />;
};

export default PrivateRoute;

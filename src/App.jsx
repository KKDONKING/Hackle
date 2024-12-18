import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LoginForm from "./components/LoginForm/LoginForm";
import RegisterForm from "./components/RegisterForm/RegisterForm";

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
};

export default App;

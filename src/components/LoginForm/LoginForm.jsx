import React from "react";
import { motion } from "framer-motion";
import "./LoginForm.css";
import { Link } from "react-router-dom";

const LoginForm = () => {
  return (
    <motion.div
      className="wrapper"
      initial={{ opacity: 0, y: -100 }} // Starting animation state
      animate={{ opacity: 1, y: 0 }} // Ending animation state
      exit={{ opacity: 0, y: 100 }} // Exit animation state
      transition={{ duration: 0.5 }} // Animation duration
    >
      <form>
        <h1>Login</h1>
        <div className="input-box">
          <input type="text" placeholder="Username" required />
        </div>
        <div className="input-box">
          <input type="password" placeholder="Password" required />
        </div>
        <div className="remember-forgot">
          <label>
            <input type="checkbox" /> Remember me
          </label>
          <a href="#">Forgot Password</a>
        </div>
        <button type="submit" className="btn">
          Login
        </button>
        <div className="register-link">
          <p>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </form>
    </motion.div>
  );
};

export default LoginForm;

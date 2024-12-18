import React from "react";
import { motion } from "framer-motion";
import "./RegisterForm.css";
import { Link } from "react-router-dom";

const RegisterForm = () => {
  return (
    <motion.div
      className="wrapper"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 0.5 }}
    >
      <form>
        <h1>Register</h1>
        <div className="input-box">
          <input type="text" placeholder="Username" required />
        </div>
        <div className="input-box">
          <input type="email" placeholder="Email" required />
        </div>
        <div className="input-box">
          <input type="password" placeholder="Password" required />
        </div>
        <button type="submit" className="btn">
          Register
        </button>
        <div className="login-link">
          <p>
            Already have an account? <Link to="/">Login</Link>
          </p>
        </div>
      </form>
    </motion.div>
  );
};

export default RegisterForm;

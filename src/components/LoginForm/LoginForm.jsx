import React, { useState } from "react";
import { motion } from "framer-motion";
import "./LoginForm.css";
import { Link } from "react-router-dom";

const LoginForm = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const { username, password } = formData;

    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    // Reset error and perform login (replace with actual authentication logic)
    setError("");
    console.log("Login successful!", formData);

    // Redirect logic here, if needed
  };

  return (
    <motion.div
      className="wrapper"
      initial={{ opacity: 0, y: -50 }} // Starting animation state
      animate={{ opacity: 1, y: 0 }} // Ending animation state
      exit={{ opacity: 0, y: 50 }} // Exit animation state
      transition={{ duration: 0.5, ease: "easeOut" }} // Animation duration
    >
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>

        {/* Error Message */}
        {error && <p className="error-message">{error}</p>}

        {/* Username Input */}
        <div className="input-box">
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        {/* Password Input */}
        <div className="input-box">
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        {/* Remember Me and Forgot Password */}
        <div className="remember-forgot">
          <label>
            <input type="checkbox" />
            Remember me
          </label>
          <a href="#" onClick={() => alert("Forgot Password functionality is not implemented yet!")}>
            Forgot Password?
          </a>
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn">
          Login
        </button>

        {/* Register Link */}
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

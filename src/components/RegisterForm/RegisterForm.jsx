import React, { useState } from "react";
import { motion } from "framer-motion";
import "./RegisterForm.css";
import { Link } from "react-router-dom";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const { username, email, password, confirmPassword } = formData;

    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Reset error and handle registration logic
    setError("");
    console.log("Registration successful!", formData);

    // Redirect or further logic here
  };

  return (
    <motion.div
      className="wrapper"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <form onSubmit={handleSubmit}>
        <h1>Register</h1>

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

        {/* Email Input */}
        <div className="input-box">
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
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

        {/* Confirm Password Input */}
        <div className="input-box">
           <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Retype password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn">
          Register
        </button>

        {/* Login Link */}
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

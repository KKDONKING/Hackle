import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import "./RegisterForm.css";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    hasUpperCase: false,
    hasNumber: false,
    hasSymbol: false,
    meetsRequirements: false,
    message: ""
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Check password strength when password field changes
    if (name === "password") {
      validatePasswordStrength(value);
    }
  };

  // Function to validate password strength
  const validatePasswordStrength = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    // Count how many requirements are met
    const requirementsMet = [hasUpperCase, hasNumber, hasSymbol].filter(Boolean).length;
    const meetsRequirements = requirementsMet >= 2;
    
    // Create appropriate message
    let message = "";
    if (password.length === 0) {
      message = "";
    } else if (meetsRequirements) {
      message = "Password strength: Good";
    } else {
      message = `Password must contain at least 2 of the following:`;
    }
    
    setPasswordStrength({
      hasUpperCase,
      hasNumber,
      hasSymbol,
      meetsRequirements,
      message
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    // Check password requirements
    if (!passwordStrength.meetsRequirements) {
      setError("Password must contain at least 2 of the following: uppercase letter, number, symbol");
      return;
    }

    try {
      // Firebase registration
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email,
        createdAt: new Date(),
      });

      console.log("Registration successful!", user);

      // Redirect to login page
      navigate("/");
    } catch (err) {
      console.error(err.message);
      setError("Error registering user. Try again.");
    }
  };

  return (
    <div className="register-container">
      <motion.div
        className="register-form-container"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <form onSubmit={handleSubmit}>
          <h1>Register</h1>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <input
              name="username"
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {passwordStrength.message && formData.password.length > 0 && (
              <div className="password-requirements">
                <div className={`password-strength ${passwordStrength.meetsRequirements ? 'strength-good' : 'strength-weak'}`}>
                  {passwordStrength.message}
                </div>
                
                <div className="requirements-tracker">
                  <div className={`requirement ${passwordStrength.hasUpperCase ? 'met' : 'not-met'}`}>
                    <span className="requirement-icon">{passwordStrength.hasUpperCase ? '✓' : '○'}</span>
                    <span className="requirement-text">Uppercase letter</span>
                  </div>
                  <div className={`requirement ${passwordStrength.hasNumber ? 'met' : 'not-met'}`}>
                    <span className="requirement-icon">{passwordStrength.hasNumber ? '✓' : '○'}</span>
                    <span className="requirement-text">Number</span>
                  </div>
                  <div className={`requirement ${passwordStrength.hasSymbol ? 'met' : 'not-met'}`}>
                    <span className="requirement-icon">{passwordStrength.hasSymbol ? '✓' : '○'}</span>
                    <span className="requirement-text">Symbol</span>
                  </div>
                </div>
                
                <div className="strength-meter">
                  <div className="strength-meter-bar">
                    <div 
                      className={`strength-meter-fill ${
                        passwordStrength.meetsRequirements ? 'good-strength' : 'weak-strength'
                      }`}
                      style={{ 
                        width: `${(passwordStrength.hasUpperCase + passwordStrength.hasNumber + passwordStrength.hasSymbol) * 33.33}%` 
                      }}
                    ></div>
                  </div>
                  <div className="strength-meter-label">
                    {passwordStrength.meetsRequirements ? 'Strong enough' : 'Need to meet at least 2 requirements'}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="form-group">
            <input
              name="confirmPassword"
              type="password"
              placeholder="Retype password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="register-button">
            Register
          </button>
          <p className="login-link">
            Already have an account? <Link to="/">Login</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterForm;

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import "./LoginForm.css";

const LoginForm = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check for remembered credentials on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    const wasRemembered = localStorage.getItem("rememberMe") === "true";
    
    if (wasRemembered && rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle remember me toggle
  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  // Handle password reset
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResetSuccess("");

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess("Password reset email sent! Please check your inbox.");
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess("");
      }, 3000);
    } catch (err) {
      console.error(err.message);
      setError("Failed to send reset email. Please check your email address.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = formData;
    setError("");
    setIsLoading(true);

    try {
      // Set persistence based on remember me
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      // Firebase login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful!", userCredential.user);
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
      }
      
      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error(err.message);
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="wrapper"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>

        {error && <p className="error-message">{error}</p>}
        {resetSuccess && <p className="success-message">{resetSuccess}</p>}

        <div className="input-box">
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-box">
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="remember-forgot">
          <label>
            <input 
              type="checkbox" 
              checked={rememberMe}
              onChange={handleRememberMeChange}
            />
            Remember me
          </label>
          <button 
            type="button" 
            className="forgot-password-link"
            onClick={() => setShowResetModal(true)}
          >
            Forgot Password?
          </button>
        </div>

        <button type="submit" className="btn" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>

        <div className="register-link">
          <p>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </form>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="close-btn"
              onClick={() => {
                setShowResetModal(false);
                setError("");
                setResetSuccess("");
              }}
            >
              ×
            </button>
            <h2>Reset Password</h2>
            <form onSubmit={handleForgotPassword}>
              <div className="input-box">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="error-message">{error}</p>}
              {resetSuccess && <p className="success-message">{resetSuccess}</p>}
              <button 
                type="submit" 
                className="btn reset-btn"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LoginForm;

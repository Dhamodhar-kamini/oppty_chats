// src/pages/auth/EmployeeLogin.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, clearAuthUser } from "../../utils/auth.js";
import { useChats } from "../../context/ChatContext.jsx";
import "./EmployeeLogin.css";

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { fetchChats, clearChats } = useChats();

  useEffect(() => {
    clearChats();
    clearAuthUser();
  }, [clearChats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const result = await loginUser(email.trim(), password);

      if (result.success) {
        await new Promise(resolve => setTimeout(resolve, 300));
        await fetchChats();
        navigate("/chats", { replace: true });
      } else {
        setError(result.error || "Invalid email or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">💬</div>
          <h1>Welcome Back</h1>
          <p>Sign in to continue to your chats</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">⚠️ {error}</div>}

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
import React, { useState, useContext } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { LoginUser } from "../src/Api";
import { AuthContext } from "../src/Authcontext";
import { useNavigate } from "react-router-dom";

import "../src/App.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await LoginUser({ email, password });
      login(data);
      navigate("/");
    } catch (err) {
      const msg = (err?.message || "").toLowerCase();
      const status = err?.status;
      if (
        status === 404 ||
        status === 410 ||
        msg.includes("deleted") ||
        msg.includes("removed") ||
        msg.includes("not found")
      ) {
        setError("Your account has been deleted. Please contact support at makeamitsva@gmail.com if this is unexpected.");
      } else if (msg.includes("banned")) {
        setError("Your account is banned. Please contact support at makeamitsva@gmail.com.");
      } else {
        setError(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const baseMessageStyle = {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: "10px",
  };

  return (
    <div className="page-container">
      <Header />

      <div className="content">
        <form className="sign-in-form" onSubmit={handleSubmit}>
          <h1>Login</h1>

          {error && <p style={{ ...baseMessageStyle, color: "red" }}>{error}</p>}
          {message && <p style={{ ...baseMessageStyle, color: "green" }}>{message}</p>}

          <label htmlFor="email">E-mail</label>
          <input
            placeholder="Enter your email"
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            placeholder="Enter your password"
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Connecting..." : "Login"}
          </button>
        </form>
      </div>

      <Footer />
    </div>
  );
}

export default Login;

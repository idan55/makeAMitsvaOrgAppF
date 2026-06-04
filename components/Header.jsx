import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../src/Authcontext";
import "../src/App.css";

function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <NavLink
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginRight: "20px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <img
            src="/logo.png"
            alt="Make A Mitsva logo"
            style={{ width: "42px", height: "42px", objectFit: "contain" }}
          />
          <h1 style={{ margin: 0 }}>Make A Mitsva</h1>
        </NavLink>

        <NavLink to="/" style={{ marginRight: "12px" }}>
          Home
        </NavLink>

        {!user && (
          <>
            <NavLink to="/register" style={{ marginRight: "12px" }}>
              Register
            </NavLink>
            <NavLink to="/login" style={{ marginRight: "12px" }}>
              Login
            </NavLink>
          </>
        )}

        {user && (
          <>
            <NavLink to="/myaccount" style={{ marginRight: "12px" }}>
              My Account
            </NavLink>
            {user.role === "admin" && (
              <NavLink
                to="/admin"
                style={{ marginRight: "12px", color: "#e53935" }}
              >
                Admin
              </NavLink>
            )}
          </>
        )}
      </div>

      {user && (
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            border: "1px solid #c62828",
            background: "#e53935",
            color: "white",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
          }}
        >
          Logout
        </button>
      )}
    </header>
  );
}

export default Header;

import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../src/Authcontext";
import "../src/App.css";

function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <div className="site-nav">
        <NavLink
          to="/"
          className="brand-link"
        >
          <img
            src="/logo.png"
            alt="Make A Mitsva logo"
            className="brand-logo"
          />
          <h1>Make A Mitsva</h1>
        </NavLink>

        <NavLink to="/">
          Home
        </NavLink>

        {!user && (
          <>
            <NavLink to="/register">
              Register
            </NavLink>
            <NavLink to="/login">
              Login
            </NavLink>
          </>
        )}

        {user && (
          <>
            <NavLink to="/myaccount">
              My Account
            </NavLink>
            {user.role === "admin" && (
              <>
                <NavLink to="/admin">Admin</NavLink>
                <NavLink to="/admin/identity">Identity Reviews</NavLink>
              </>
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
          className="logout-button"
        >
          Logout
        </button>
      )}
    </header>
  );
}

export default Header;

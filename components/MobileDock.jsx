import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../src/Authcontext";

function MobileDock() {
  const { user } = useContext(AuthContext);

  return (
    <nav className="mobile-dock" aria-label="Primary">
      <NavLink to="/" className="mobile-dock-link">
        <span className="mobile-dock-icon">⌂</span>
        <span>Home</span>
      </NavLink>

      {user ? (
        <NavLink to="/myaccount" className="mobile-dock-link">
          <span className="mobile-dock-icon">◎</span>
          <span>Account</span>
        </NavLink>
      ) : (
        <NavLink to="/register" className="mobile-dock-link">
          <span className="mobile-dock-icon">＋</span>
          <span>Join</span>
        </NavLink>
      )}

      {!user && (
        <NavLink to="/login" className="mobile-dock-link">
          <span className="mobile-dock-icon">→</span>
          <span>Login</span>
        </NavLink>
      )}

      {user?.role === "admin" && (
        <NavLink to="/admin" className="mobile-dock-link mobile-dock-link-admin">
          <span className="mobile-dock-icon">⚑</span>
          <span>Admin</span>
        </NavLink>
      )}
    </nav>
  );
}

export default MobileDock;

import React, { createContext, useState, useEffect, useContext } from "react";
import { getMe } from "./Api";

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log("🔄 Restored user from localStorage:", parsedUser);
        setUser(parsedUser);
        setToken(storedToken);
      } catch (err) {
        console.error("❌ Error parsing user from localStorage:", err);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }

    const fetchFreshUser = async () => {
      if (!storedToken) return;
      try {
        const fresh = await getMe(storedToken);
        if (fresh) {
          setUser(fresh);
          setToken(storedToken);
          localStorage.setItem("user", JSON.stringify(fresh));
        }
      } catch (err) {
        console.error("❌ Failed to refresh user from backend:", err);
      }
    };
    fetchFreshUser();
  }, []);

  const login = (userData) => {
    console.log("🔐 Login called with:", userData);

    if (userData.user && userData.token) {
      setUser(userData.user);
      setToken(userData.token);
      localStorage.setItem("user", JSON.stringify(userData.user));
      localStorage.setItem("token", userData.token);
    } 
    else {
      setUser(userData);
      setToken(null);
      localStorage.setItem("user", JSON.stringify(userData));
    }
  };

  const logout = () => {
    console.log("🚪 Logout called");
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

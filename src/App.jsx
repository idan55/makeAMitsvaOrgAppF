import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./Authcontext";
import Home from "../pages/Home";
import Register from "../pages/Register";
import Myaccount from "../pages/Myaccount";
import Login from "../pages/Login";
import Admin from "../pages/Admin";
import AdminIdentityReviews from "../pages/AdminIdentityReviews";
import VerifyIdentity from "../pages/VerifyIdentity";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/myaccount" element={<Myaccount />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-identity" element={<VerifyIdentity />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/identity" element={<AdminIdentityReviews />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

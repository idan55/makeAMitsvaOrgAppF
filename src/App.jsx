import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./Authcontext";
import Home from "../pages/Home";
import Register from "../pages/Register";
import Myaccount from "../pages/Myaccount";
import Login from "../pages/Login";
import Admin from "../pages/Admin";
import MobileDock from "../components/MobileDock";
import InstallPrompt from "../components/InstallPrompt";

function AppShell() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/myaccount" element={<Myaccount />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
      <MobileDock />
    </>
  );
}

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

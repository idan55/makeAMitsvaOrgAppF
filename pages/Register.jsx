import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { registerUser, LoginUser } from "../src/Api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../src/Authcontext";
import { normalizePhone } from "../src/phoneUtils";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL_ENV) ||
  (typeof process !== "undefined" && process.env?.API_URL_ENV) ||
  "http://localhost:4000/api";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const validatePassword = (value) => {
    if (value.length < 8) return "At least 8 characters.";
    if (!/[A-Z]/.test(value)) return "At least one uppercase letter.";
    if (!/[0-9]/.test(value)) return "At least one number.";
    return "";
  };

  const handlePassChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setError(validatePassword(value));
  };

  const compressImage = (file, maxDim = 1200, quality = 0.7) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height >= width && height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Compression failed"));
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const compressImageAdaptive = async (file) => {
    let candidate = file.size > 2 * 1024 * 1024 ? await compressImage(file, 1200, 0.7) : file;
    if (candidate.size > 2 * 1024 * 1024) {
      candidate = await compressImage(candidate, 900, 0.55);
    }
    return candidate;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    console.log("📤 File selected:", file.name);
    setIsUploading(true);
    try {
      const workingFile = await compressImageAdaptive(file);
      const formData = new FormData();
      formData.append("image", workingFile);
      console.log("📤 Sending to /api/upload...");
      
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      
      console.log("📥 Response status:", res.status);
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Upload failed");
      }
      
      const data = await res.json();
      console.log("✅ Cloudinary URL received:", data.url);
      
      setProfileImage(data.url);
      console.log("🔹 profileImage juste après upload:", data.url);

      setFeedback({ type: "success", text: "Image uploaded successfully ✅" });
    } catch (err) {
      console.error("❌ Upload error:", err);
      setFeedback({ type: "error", text: err.message || "Error uploading image" });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhone(value);

    if (!value) {
      setPhoneError("");
      return;
    }

    const normalized = normalizePhone(value);
    setPhoneError(
      normalized
        ? ""
        : "Please enter a valid phone number with country code (e.g. +1 415 555 0100)"
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const pwdError = validatePassword(password);
    if (pwdError) {
      setFeedback({ type: "error", text: "Password error: " + pwdError });
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setPhoneError("Please enter a valid phone number with country code.");
      setFeedback({ type: "error", text: "Please enter a valid phone number with country code." });
      return;
    }
  
    if (!profileImage) {
      setFeedback({ type: "error", text: "Please upload a profile image." });
      return;
    }
  
    try {
      const userData = {
        name,
        age,
        email,
        password,
        phone: normalizedPhone,
        profileImage,
      };
  
      const registerResponse = await registerUser(userData);
      console.log("✅ Register response:", registerResponse);

      const loginResponse = await LoginUser({ email, password });
      login(loginResponse);

      setPhone(normalizedPhone);
      setFeedback({ type: "success", text: "Account created and logged in!" });
      navigate("/");
    } catch (err) {
      console.error("❌ Registration error:", err);
      setFeedback({ type: "error", text: err.message || "Registration failed" });
    }
  };
  
  return (
    <div className="page-container">
      <Header />
      <div className="content" style={{ maxWidth: "500px", margin: "40px auto", padding: "20px", background: "#f9f9f9", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <h1 style={{ textAlign: "center" }}>Register</h1>
          <style>{`.auth-message{ text-align:center; font-weight:bold; margin-bottom:10px; }`}</style>

          <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
          <input type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} required min={16} max={120} style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
          <input type="password" placeholder="Password" value={password} onChange={handlePassChange} required style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
          {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}
          <input
            type="tel"
            placeholder="Phone (e.g. +1 415 555 0100)"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={() => {
              const normalized = normalizePhone(phone);
              if (normalized) setPhone(normalized);
            }}
            required
            style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
          {phoneError && <p style={{ color: "red", fontSize: "14px" }}>{phoneError}</p>}

          <label>Profile Picture:</label>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {isUploading && <p>Uploading image...</p>}
          {profileImage && <img src={profileImage} alt="Preview" style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", marginTop: "10px" }} />}

          <button
            type="submit"
            disabled={error !== "" || phoneError !== "" || isUploading || !profileImage}
            style={{ padding: "12px", borderRadius: "8px", background: "#2196f3", color: "white", fontWeight: "bold", border: "none", cursor: isUploading ? "not-allowed" : "pointer", opacity: isUploading || !profileImage ? 0.6 : 1 }}
          >
            Register
          </button>

          {feedback && (
            <p
              className="auth-message"
              style={{
                color: feedback.type === "error" ? "red" : "green",
              }}
            >
              {feedback.text}
            </p>
          )}
        </form>
      </div>
      <Footer />
    </div>
  );
}

export default Register;

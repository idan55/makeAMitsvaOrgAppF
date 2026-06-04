import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWindow from "../components/ChatWindow/ChatWindow";
import { useAuth } from "../src/Authcontext";
import { formatPhoneForDisplay } from "../src/phoneUtils";
import {
  getMyOpenRequests,
  getRequestsISolved,
  getMyCompletedRequests,
  completeRequest,
  getMe,
  startChat,
  updateProfileImage,
  deleteMyAccount,
  listMyChats,
} from "../src/Api";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL_ENV) ||
  (typeof process !== "undefined" && process.env?.API_URL_ENV) ||
  "http://localhost:4000/api";

function Myaccount() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [myOpenRequests, setMyOpenRequests] = useState([]);
  const [mySolvedForOthers, setMySolvedForOthers] = useState([]);
  const [myCompletedCreated, setMyCompletedCreated] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState("");
  const [chatNotification, setChatNotification] = useState("");
  const fileInputRef = useRef(null);
  const [showPicMenu, setShowPicMenu] = useState(false);

  const [activeChat, setActiveChat] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    let timer;
    async function loadData(showLoading = false) {
      try {
        if (showLoading) setLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        
        if (!token) throw new Error("No token");

        const [openData, solvedData, completedCreatedData, meData] = await Promise.all([
          getMyOpenRequests(token),
          getRequestsISolved(token),
          getMyCompletedRequests(token),
          getMe(token),
        ]);

        setMyOpenRequests(openData.requests || []);
        setMySolvedForOthers(solvedData.requests || []);
        setMyCompletedCreated(completedCreatedData.requests || []);
        if (meData) {
          login(meData);
          localStorage.setItem("user", JSON.stringify(meData));
        }
      } catch (err) {
        console.error("Myaccount load error:", err);
        setError(err.message || "Failed to load account data");
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("token") || msg.includes("not found") || msg.includes("unauthorized")) {
          logout();
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/register", { replace: true });
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    }

    loadData(true);
    timer = setInterval(() => loadData(false), 8000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  async function handleSolved(requestId) {
    try {
      setError("");
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("You must be logged in");
        return;
      }

      await completeRequest(requestId, token);
      setMyOpenRequests((prev) => prev.filter((r) => r._id !== requestId));

      const updatedUserData = await getMe(token);
      if (updatedUserData) {
        login(updatedUserData);
        localStorage.setItem("user", JSON.stringify(updatedUserData));
      }
    } catch (err) {
      console.error("handleSolved error:", err);
      setError(err.message || "Failed to mark as solved");
    }
  }

  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in");
      return;
    }

    setIsUploading(true);
    setUploadFeedback("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      const updatedUser = await updateProfileImage({ profileImage: uploadData.url, token });
      login(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setImageError(false);
      setUploadFeedback("Profile image updated.");
    } catch (err) {
      console.error("Profile image update error:", err);
      setUploadFeedback(err.message || "Failed to update image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarClick = () => {
    if (!user.profileImage) {
      fileInputRef.current?.click();
      return;
    }
    setShowPicMenu(true);
  };

  async function handleDeleteAccount() {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    const token = localStorage.getItem("token");
    const userId = user?._id || user?.id;
    if (!token || !userId) return setError("Not logged in");
    try {
      setError("");
      await deleteMyAccount({ userId, token });
      logout();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/register", { replace: true });
    } catch (err) {
      console.error("Delete account error:", err);
      setError(err.message || "Failed to delete account");
    }
  }

  const handleOpenChat = async (request) => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("You must be logged in to view chat.");
        return;
      }
      
      if (!user) {
        setError("No user in context.");
        return;
      }

      const currentUserId = user.id || user._id;
      const creatorId = request.createdBy?._id || request.createdBy;
      const helperId = request.completedBy?._id || request.completedBy || null;

      let otherUserId;
      let otherUserObj;

      if (currentUserId === creatorId && helperId) {
        otherUserId = helperId;
        otherUserObj = request.completedBy || null;
      } else if (helperId && currentUserId === helperId) {
        otherUserId = creatorId;
        otherUserObj = request.createdBy;
      } else {
        otherUserId = creatorId;
        otherUserObj = request.createdBy;
      }

      if (!otherUserId) {
        const chats = await listMyChats(token);
        const existing = chats.find((c) => c.requestId === request._id);
        if (existing) {
          const other =
            (existing.participants || []).find(
              (p) => (p._id || p.id) && (p._id || p.id) !== currentUserId
            ) || { _id: "deleted", name: "Deleted user" };
          setActiveChat({
            chatId: existing.id,
            otherUser: other,
            requestTitle: existing.requestTitle,
            requestId: existing.requestId,
            isReadOnly: true,
          });
          setIsChatOpen(true);
          return;
        }

        setError("No other user available in this chat.");
        return;
      }

      if (otherUserId === currentUserId) {
        setError("Cannot open chat with yourself.");
        return;
      }

      const data = await startChat({ otherUserId, requestId: request._id, token });

      if (!otherUserObj || typeof otherUserObj === "string") {
        const chats = await listMyChats(token);
        const fromChat = chats.find((c) => c.id === data.chatId);
        otherUserObj =
          fromChat?.participants?.find(
            (p) => (p._id || p.id) && (p._id || p.id) !== currentUserId
          ) || { _id: "deleted", name: "Deleted user" };
      }

      setActiveChat({
        chatId: data.chatId,
        otherUser: otherUserObj,
        requestTitle: request.title,
        requestId: request._id,
        isReadOnly: true,
      });
      setIsChatOpen(true);
    } catch (err) {
      console.error("Error opening chat from Myaccount:", err);
      setError(err.message || "Failed to open chat");
    }
  };

  const stars = user?.stars ?? 0;
  const starsPercent = Math.min((stars / 500) * 100, 100);

  return (
    <div className="page-container">
      <Header />
      <div className="content" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "30px", textAlign: "center" }}>My Account</h1>

        {user && (
          <div style={{ 
            marginBottom: "40px", 
            padding: "20px", 
            background: "#f9f9f9", 
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                onClick={handleAvatarClick}
                style={{
                  position: "relative",
                  width: "140px",
                  height: "140px",
                  borderRadius: "50%",
                  margin: "0 auto",
                  cursor: "pointer",
                  overflow: "hidden",
                  border: "4px solid #2196f3",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                }}
                title="Tap to view/change picture"
              >
                {!imageError && user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name || "Profile"}
                    onError={() => {
                      console.error("❌ Image failed:", user.profileImage);
                      setImageError(true);
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #2196f3, #1976d2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "48px",
                      fontWeight: "bold",
                    }}
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(0,0,0,0.5)",
                    color: "white",
                    fontSize: "12px",
                    padding: "6px",
                  }}
                >
                  View / Change
                </div>
              </div>

              {showPicMenu && (
                <div
                  style={{
                    marginTop: "10px",
                    display: "inline-flex",
                    gap: "8px",
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "10px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  <button
                    onClick={() => {
                      window.open(user.profileImage, "_blank");
                      setShowPicMenu(false);
                    }}
                    style={{ padding: "8px 12px" }}
                    disabled={!user.profileImage}
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setShowPicMenu(false);
                      fileInputRef.current?.click();
                    }}
                    style={{ padding: "8px 12px" }}
                    disabled={isUploading}
                  >
                    Change
                  </button>
                  <button onClick={() => setShowPicMenu(false)} style={{ padding: "8px 12px" }}>
                    Cancel
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  setShowPicMenu(false);
                  handleProfileImageChange(event);
                }}
                style={{ display: "none" }}
                disabled={isUploading}
              />
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "18px", marginBottom: "8px" }}>
                <strong>Name:</strong> {user.name}
              </p>
              <p style={{ fontSize: "16px", marginBottom: "8px", color: "#666" }}>
                <strong>Email:</strong> {user.email}
              </p>
              <p style={{ fontSize: "16px", color: "#666" }}>
                <strong>Phone:</strong> {formatPhoneForDisplay(user.phone)}
              </p>
            </div>

            {uploadFeedback && (
              <div style={{ marginTop: "8px", textAlign: "center", color: uploadFeedback.includes("failed") ? "red" : "green" }}>
                {uploadFeedback}
              </div>
            )}

            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                onClick={handleDeleteAccount}
                style={{
                  padding: "10px 14px",
                  background: "#e53935",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Delete Account
              </button>
            </div>

            <div style={{ marginTop: "30px" }}>
              <p style={{ fontSize: "16px", marginBottom: "10px", textAlign: "center" }}>
                <strong>Stars:</strong> {stars} / 500
              </p>
              <div
                style={{
                  width: "100%",
                  height: "24px",
                  background: "#ddd",
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginTop: "8px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${starsPercent}%`,
                    background: stars >= 500 
                      ? "linear-gradient(90deg, #4caf50, #45a049)" 
                      : "linear-gradient(90deg, #2196f3, #1976d2)",
                    transition: "width 0.6s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "12px"
                  }}
                >
                  {starsPercent.toFixed(0)}%
                </div>
              </div>

              {stars >= 500 && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "16px 20px",
                    background: "linear-gradient(135deg, #4caf50, #45a049)",
                    color: "white",
                    fontWeight: "bold",
                    borderRadius: "10px",
                    textAlign: "center",
                    fontSize: "16px",
                    boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)"
                  }}
                >
                  🎉 Mazal tov! You earned a 100₪ coupon for יש חסד!
                </div>
              )}
            </div>
          </div>
        )}

        {loading && <p style={{ textAlign: "center", fontSize: "16px" }}>Loading...</p>}
        {error && <p style={{ color: "red", textAlign: "center", fontWeight: "bold" }}>{error}</p>}

        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
            
            <div>
              <h2 style={{ marginBottom: "15px", color: "#333" }}>My Open Requests</h2>
              {myOpenRequests.length === 0 && <p style={{ color: "#666", fontStyle: "italic" }}>No open requests.</p>}
              <div style={{ display: "flex", gap: "15px", overflowX: "auto", padding: "15px 0" }}>
                {myOpenRequests.map((req) => (
                  <div key={req._id} style={{ minWidth: "260px", flex: "0 0 auto", border: "1px solid #ddd", borderRadius: "10px", padding: "15px", background: "white", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
                    <strong style={{ fontSize: "16px", color: "#2196f3" }}>{req.title}</strong>
                    <div style={{ fontSize: "12px", color: "#999", marginTop: "5px" }}>Posted: {new Date(req.createdAt).toLocaleString()}</div>
                    <p style={{ fontSize: "14px", marginTop: "10px", color: "#555" }}>{req.description}</p>
                    {req.completedBy ? (
                      <button onClick={() => handleSolved(req._id)} style={{ marginTop: "10px", padding: "8px 16px", background: "#4caf50", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", width: "100%" }}>Mark as Solved</button>
                    ) : (
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "10px", fontStyle: "italic" }}>No helper yet.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 style={{ marginBottom: "15px", color: "#333" }}>Requests I Solved</h2>
              {mySolvedForOthers.length === 0 && <p style={{ color: "#666", fontStyle: "italic" }}>No completed requests.</p>}
              <div style={{ display: "flex", gap: "15px", overflowX: "auto", padding: "15px 0" }}>
                {mySolvedForOthers.map((req) => (
                  <div key={req._id} style={{ minWidth: "260px", flex: "0 0 auto", border: "1px solid #ddd", borderRadius: "10px", padding: "15px", background: "white", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
                    <strong style={{ fontSize: "16px", color: "#ff9800" }}>{req.title}</strong>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "5px" }}>Help seeker: {req.createdBy?.name || "Unknown"}</div>
                    <div style={{ fontSize: "12px", color: "#999", marginTop: "3px" }}>Completed: {new Date(req.updatedAt || req.createdAt).toLocaleString()}</div>
                    <p style={{ fontSize: "14px", marginTop: "10px", color: "#555" }}>{req.description}</p>
                    {(req.createdBy && req.completedBy) && (
                      <button type="button" onClick={() => handleOpenChat(req)} style={{ marginTop: "10px", padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#555", color: "white", fontSize: "13px", cursor: "pointer", fontWeight: "bold", width: "100%" }}>View Chat</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 style={{ marginBottom: "15px", color: "#333" }}>My Completed Requests</h2>
              {myCompletedCreated.length === 0 && <p style={{ color: "#666", fontStyle: "italic" }}>No completed requests.</p>}
              <div style={{ display: "flex", gap: "15px", overflowX: "auto", padding: "15px 0" }}>
                {myCompletedCreated.map((req) => (
                  <div key={req._id} style={{ minWidth: "260px", flex: "0 0 auto", border: "1px solid #ddd", borderRadius: "10px", padding: "15px", background: "white", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
                    <strong style={{ fontSize: "16px", color: "#9c27b0" }}>{req.title}</strong>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "5px" }}>Helper: {req.completedBy?.name || "Unknown"}</div>
                    <div style={{ fontSize: "12px", color: "#999", marginTop: "3px" }}>Completed: {new Date(req.updatedAt || req.createdAt).toLocaleString()}</div>
                    <p style={{ fontSize: "14px", marginTop: "10px", color: "#555" }}>{req.description}</p>
                    {(req.createdBy && req.completedBy) && (
                      <button type="button" onClick={() => handleOpenChat(req)} style={{ marginTop: "10px", padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#555", color: "white", fontSize: "13px", cursor: "pointer", fontWeight: "bold", width: "100%" }}>View Chat</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isChatOpen && activeChat && (
        <ChatWindow
          chatId={activeChat.chatId}
          currentUser={user}
          otherUser={activeChat.otherUser}
          requestTitle={activeChat.requestTitle}
          requestId={activeChat.requestId}
          isReadOnly={activeChat.isReadOnly}
          onNewMessage={({ from, requestTitle }) =>
            setChatNotification(`You have a new message from ${from} about "${requestTitle || "a request"}"`)
          }
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {chatNotification && (
        <div style={{ position: "fixed", bottom: "80px", right: "16px", background: "#fff3cd", color: "#856404", padding: "10px 14px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999 }}>
          {chatNotification}
          <button
            onClick={() => setChatNotification("")}
            style={{ marginLeft: "10px", background: "transparent", border: "none", cursor: "pointer", fontWeight: "bold" }}
          >
            ×
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Myaccount;

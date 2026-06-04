import React, { useEffect, useState, useRef } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Map from "../components/Map";
import ChatWindow from "../components/ChatWindow/ChatWindow";
import {
  startChat,
  listMyChats,
  createRequest,
  getNearbyRequests,
  wantToHelpRequest,
  completeRequest,
  getMe,
} from "../src/Api";
import { useAuth } from "../src/Authcontext";
import { getSocket } from "../src/socket";

function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const [userPos, setUserPos] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [requests, setRequests] = useState([]);
  const [chatSummaries, setChatSummaries] = useState([]);
  const lastNotifiedRef = useRef({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [selectedId, setSelectedId] = useState(null);
  const [banFlashActive, setBanFlashActive] = useState(false);
  const [showBanSupport, setShowBanSupport] = useState(false);

  const { user: currentUser, login } = useAuth();

  const urgencyBadge = (level) => {
    const map = {
      high: { label: "High", color: "#dc2626", bg: "#fee2e2" },
      normal: { label: "Normal", color: "#1d4ed8", bg: "#e0ecff" },
      low: { label: "Low", color: "#15803d", bg: "#dcfce7" },
    };
    return map[level] || map.normal;
  };

  const [activeChat, setActiveChat] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatNotification, setChatNotification] = useState("");
  const loadedNotifications = useRef(false);
  const markChatSeen = (chatId, forcedId) => {
    if (!chatId) return;
    const summary = chatSummaries.find((c) => c.id === chatId);
    const lastSeen =
      forcedId || summary?.lastMessage?._id || summary?.lastMessage?.createdAt;
    if (lastSeen) {
      lastNotifiedRef.current[chatId] = lastSeen;
      localStorage.setItem(
        "lastNotifiedChatMsg",
        JSON.stringify(lastNotifiedRef.current)
      );
    }
  };

  const itemRefs = useRef({});

  const upsertChatSummary = (previous, payload) => {
    const chatId = payload?.chatId || payload?.id;
    if (!chatId) return previous;

    const nextSummary = {
      id: chatId,
      requestId: payload.requestId || null,
      requestTitle: payload.requestTitle || "Request",
      participants: payload.participants || [],
      lastMessage: payload.message || payload.lastMessage || null,
      updatedAt:
        payload.updatedAt ||
        payload.message?.createdAt ||
        new Date().toISOString(),
      isClosed: Boolean(payload.isClosed),
    };

    const current = Array.isArray(previous) ? [...previous] : [];
    const existingIndex = current.findIndex((chat) => chat.id === chatId);
    if (existingIndex >= 0) {
      current[existingIndex] = {
        ...current[existingIndex],
        ...nextSummary,
      };
    } else {
      current.push(nextSummary);
    }

    current.sort(
      (left, right) =>
        new Date(right.updatedAt || 0).getTime() -
        new Date(left.updatedAt || 0).getTime()
    );
    return current;
  };

  const refreshUserFromServer = async (token) => {
    try {
      const fresh = await getMe(token);
      if (fresh) {
        login({ user: fresh, token });
        localStorage.setItem("user", JSON.stringify(fresh));
      }
      return fresh;
    } catch (err) {
      console.error("Failed to refresh user state:", err);
      return currentUser;
    }
  };

  async function handleCreateRequest(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      alert("You must be logged in to create a request");
      return;
    }

    const freshUser = await refreshUserFromServer(token);
    if (freshUser?.isBanned) {
      setError(
        "Your account is banned. Please contact support to unban: makeamitsva@gmail.com"
      );
      return;
    }

    if (!userPos) {
      alert("Location not ready yet");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const [lat, lng] = userPos;

      const data = await createRequest({
        title,
        description,
        latitude: lat,
        longitude: lng,
        urgency,
        token,
      });

      const updatedBanState =
        data?.user?.isBanned ?? data?.isBanned ?? freshUser?.isBanned;
      if (updatedBanState) {
        setError(
          "Your account is banned. Please contact support to unban: makeamitsva@gmail.com"
        );
        return;
      }

      setRequests((prev) => [...prev, data.request]);
      setTitle("");
      setDescription("");
      setUrgency("normal");
      setSuccess(data.message || "Request successfully created ✅");
    } catch (err) {
      console.error("Error creating request:", err);
      setError(
        err.message === "Identity verification required"
          ? "Please verify your identity before creating a request."
          : err.message || "Failed to create request"
      );
      setSuccess("");
    }
  }

  async function handleWantToHelp(requestId, e) {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to help");
      return;
    }

    const freshUser = await refreshUserFromServer(token);
    if (freshUser?.isBanned) {
      setError(
        "Your account is banned. Please contact support to unban: makeamitsva@gmail.com"
      );
      return;
    }

    try {
      setError("");
      const data = await wantToHelpRequest(requestId, token);

      const updatedBanState =
        data?.user?.isBanned ?? data?.isBanned ?? freshUser?.isBanned;
      if (updatedBanState) {
        setError(
          "Your account is banned. Please contact support to unban: makeamitsva@gmail.com"
        );
        return;
      }

      setRequests((prev) =>
        prev.map((r) => (r._id === requestId ? data.request : r))
      );
    } catch (err) {
      console.error("wantToHelp error:", err);
      setError(
        err.message === "Identity verification required"
          ? "Please verify your identity before helping with a request."
          : err.message || "Failed to mark as helper"
      );
    }
  }

  async function handleMarkCompleted(requestId, e) {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in");
      return;
    }

    try {
      setError("");
      const data = await completeRequest(requestId, token);
      setRequests((prev) =>
        prev.map((r) => (r._id === requestId ? data.request : r))
      );
    } catch (err) {
      console.error("markCompleted error:", err);
      setError(err.message || "Failed to mark as completed");
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lastNotifiedChatMsg");
      if (stored) lastNotifiedRef.current = JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to parse lastNotifiedChatMsg", e);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.error(err);
        setError("Could not get your location");
      }
    );
  }, []);

  useEffect(() => {
    let timer;

    async function loadRequests(showLoading = false) {
      if (!userPos) return;
      try {
        if (showLoading) setLoading(true);
        setError("");

        const [lat, lng] = userPos;
        const data = await getNearbyRequests({
          latitude: lat,
          longitude: lng,
          distanceKm: radiusKm,
        });

        setRequests(data.requests || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load nearby requests");
      } finally {
        if (showLoading) setLoading(false);
      }
    }

    loadRequests(true);
    timer = setInterval(() => loadRequests(false), 8000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [userPos, radiusKm, currentUser?.age]);

  useEffect(() => {
    let timer;
    if (currentUser?.isBanned) {
      setShowBanSupport(false);
      setBanFlashActive(true);
      timer = setTimeout(() => {
        setBanFlashActive(false);
        setShowBanSupport(true);
      }, 3000);
    } else {
      setBanFlashActive(false);
      setShowBanSupport(false);
    }
    return () => timer && clearTimeout(timer);
  }, [currentUser?.isBanned]);

  useEffect(() => {
    async function loadChats() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const chats = await listMyChats(token);
        setChatSummaries(chats || []);

        if (!loadedNotifications.current) {
          chats.forEach((chat) => {
            const lastId = chat.lastMessage?._id || chat.lastMessage?.createdAt;
            if (lastId) {
              lastNotifiedRef.current[chat.id] = lastId;
            }
          });
          localStorage.setItem(
            "lastNotifiedChatMsg",
            JSON.stringify(lastNotifiedRef.current)
          );
          loadedNotifications.current = true;
        }
      } catch (err) {
        console.error("load chats error", err);
      }
    }

    loadChats();
  }, [currentUser]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !currentUser) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleIncomingMessage = (payload) => {
      const currentUserId = currentUser?.id || currentUser?._id;
      const senderId =
        typeof payload?.message?.sender === "string"
          ? payload.message.sender
          : payload?.message?.sender?._id;
      const messageId = payload?.message?._id || payload?.message?.createdAt;

      setChatSummaries((prev) => upsertChatSummary(prev, payload));

      if (!senderId || senderId === currentUserId || !messageId) {
        if (messageId && payload?.chatId) {
          lastNotifiedRef.current[payload.chatId] = messageId;
          localStorage.setItem(
            "lastNotifiedChatMsg",
            JSON.stringify(lastNotifiedRef.current)
          );
        }
        return;
      }

      if (activeChat?.chatId === payload.chatId && isChatOpen) {
        markChatSeen(payload.chatId, messageId);
        setChatNotification((current) =>
          current?.chatId === payload.chatId ? "" : current
        );
        return;
      }

      if (lastNotifiedRef.current[payload.chatId] === messageId) {
        return;
      }

      const otherUser = (payload.participants || []).find(
        (participant) =>
          (participant._id || participant.id) &&
          (participant._id || participant.id) !== currentUserId
      );

      setChatNotification({
        text: `You have a new message about "${payload.requestTitle || "a request"}"`,
        chatId: payload.chatId,
        requestId: payload.requestId,
        requestTitle: payload.requestTitle,
        otherUser,
        participants: payload.participants || [],
        lastId: messageId,
      });
      lastNotifiedRef.current[payload.chatId] = messageId;
      localStorage.setItem(
        "lastNotifiedChatMsg",
        JSON.stringify(lastNotifiedRef.current)
      );
    };

    const handleClosed = (payload) => {
      setChatSummaries((prev) => upsertChatSummary(prev, payload));
      if (activeChat?.chatId === payload?.chatId) {
        setActiveChat((current) =>
          current ? { ...current, isReadOnly: true } : current
        );
      }
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:closed", handleClosed);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:closed", handleClosed);
    };
  }, [activeChat, currentUser, isChatOpen]);

  useEffect(() => {
    if (activeChat && isChatOpen) {
      markChatSeen(activeChat.chatId);
    }
  }, [activeChat, isChatOpen, chatSummaries]);

  function handleSelectRequest(id) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  useEffect(() => {
    if (!selectedId) return;

    const el = itemRefs.current[selectedId];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedId]);

  const handleOpenChat = async (request) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to chat");
        return;
      }

      const currentUserId = currentUser?.id || currentUser?._id;
      const creatorId = request.createdBy?._id || request.createdBy;
      const helperId = request.completedBy?._id || request.completedBy || null;

      let otherUserId;

      if (currentUserId === creatorId && helperId) {
        otherUserId = helperId;
      } else if (currentUserId === helperId) {
        otherUserId = creatorId;
      } else {
        otherUserId = creatorId;
      }

      if (!otherUserId) {
        const summary = chatSummaries.find((c) => c.requestId === request._id);
        if (summary) {
          const other = (summary.participants || []).find(
            (p) => (p._id || p.id) && (p._id || p.id) !== currentUserId
          );
          otherUserId = other?._id || other?.id;
        }
      }

      if (!otherUserId) {
        alert("No other user available to chat with yet.");
        return;
      }

      if (otherUserId === currentUserId) {
        console.error("Resolved otherUserId to currentUser", {
          currentUserId,
          creatorId,
          helperId,
        });
        alert("Cannot start a chat with yourself.");
        return;
      }

      const data = await startChat({
        otherUserId,
        requestId: request._id,
        token,
      });

      let otherUserObj = request.createdBy;
      if (currentUserId === creatorId && request.completedBy) {
        otherUserObj = request.completedBy;
      } else if (currentUserId === helperId) {
        otherUserObj = request.createdBy;
      }
      if (!otherUserObj || typeof otherUserObj === "string") {
        const summary = chatSummaries.find((c) => c.id === data.chatId);
        const currentId = currentUser?.id || currentUser?._id;
        otherUserObj = summary?.participants?.find(
          (p) => (p._id || p.id) && (p._id || p.id) !== currentId
        ) || { _id: "deleted", name: "Deleted user" };
      }

      setActiveChat({
        chatId: data.chatId,
        otherUser: otherUserObj,
        requestTitle: request.title,
        requestId: request._id,
      });
      markChatSeen(data.chatId);
      setChatNotification("");
      setIsChatOpen(true);
    } catch (err) {
      console.error("Error opening chat:", err);
      alert(err.message);
    }
  };

  return (
    <div className="page-container">
      <Header />
      <div className="content">
        <h2>Nearby Mitzvot</h2>

        {currentUser?.isBanned && (
          <div
            style={{
              margin: "12px 0",
              padding: "12px 14px",
              background: "#ffebee",
              color: "#c62828",
              border: "1px solid #ef9a9a",
              borderRadius: "8px",
              fontWeight: "bold",
            }}
          >
            Your account is banned. Please contact support to unban:
            makeamitsva@gmail.com
          </div>
        )}

        {currentUser?.isBanned && banFlashActive && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(255, 0, 0, 0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              color: "white",
              fontSize: "64px",
              fontWeight: "900",
              textShadow: "0 0 16px rgba(0,0,0,0.6)",
              animation: "banFlash 0.6s ease-in-out infinite",
              textTransform: "uppercase",
            }}
          >
            BANNED!
            <style>
              {`@keyframes banFlash {
                0% { opacity: 1; }
                50% { opacity: 0.2; }
                100% { opacity: 1; }
              }`}
            </style>
          </div>
        )}

        {currentUser?.isBanned && showBanSupport && !banFlashActive && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(255, 255, 255, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9998,
              color: "#c62828",
              fontSize: "28px",
              fontWeight: "800",
              padding: "40px",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Please contact support to unban: makeamitsva@gmail.com
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label>
            Distance: {radiusKm} km
            <input
              type="range"
              min="1"
              max="20"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ marginLeft: "10px", width: "200px" }}
            />
          </label>
          <button
            onClick={() => {
              setRadiusKm(20000);
            }}
          >
            Global requests
          </button>
        </div>

        <form onSubmit={handleCreateRequest} style={{ marginBottom: "20px" }}>
          <h3>Add a new request</h3>
          <input
            type="text"
            placeholder="Title (max 10 characters)"
            maxLength={10}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
          <textarea
            placeholder="Description (max 200 characters)"
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              minHeight: "80px",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "10px",
              alignItems: "center",
            }}
          >
            <label style={{ fontWeight: "600" }}>Urgency:</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Create request
          </button>
        </form>

        {success && (
          <p style={{ color: "green", marginTop: "10px", fontWeight: "bold" }}>
            {success}
          </p>
        )}
        {error && (
          <p style={{ color: "red", marginTop: "10px", fontWeight: "bold" }}>
            {error}
          </p>
        )}
        {loading && <p>Loading nearby mitzvot...</p>}

        {userPos && (
          <div
            className="map-window-wrapper"
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            <div className="map-wrapper" style={{ flex: "1 1 60%" }}>
              <Map
                userPos={userPos}
                requests={requests}
                selectedId={selectedId}
                onSelectRequest={handleSelectRequest}
              />
            </div>

            <div className="window-wrapper" style={{ flex: "1 1 40%" }}>
              <h3>Nearest requests</h3>
              <div
                className="request-list"
                style={{
                  maxHeight: "500px",
                  overflowY: "auto",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                {requests.length === 0 && (
                  <p>No requests found in this radius.</p>
                )}
                {requests.map((req) => {
                  const isExpanded = selectedId === req._id;

                  const currentUserId = currentUser?.id || currentUser?._id;
                  const creatorId = req.createdBy?._id || req.createdBy;
                  const helperId = req.completedBy?._id || req.completedBy;

                  const isOwner = currentUserId && creatorId === currentUserId;
                  const isHelper = currentUserId && helperId === currentUserId;
                  const hasHelper = Boolean(helperId);
                  const canChat =
                    (isOwner && helperId) || (isHelper && creatorId);

                  return (
                    <div
                      key={req._id}
                      ref={(el) => {
                        itemRefs.current[req._id] = el;
                      }}
                      className="request-item"
                      onClick={() => handleSelectRequest(req._id)}
                      style={{
                        padding: "15px",
                        marginBottom: "10px",
                        border: isExpanded
                          ? "2px solid #007bff"
                          : "1px solid #ddd",
                        borderRadius: "8px",
                        cursor: "pointer",
                        backgroundColor: isExpanded ? "#f0f8ff" : "white",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <strong>{req.title}</strong>
                      <div style={{ marginTop: "6px" }}>
                        {(() => {
                          const badge = urgencyBadge(req.urgency);
                          return (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 8px",
                                borderRadius: "999px",
                                background: badge.bg,
                                color: badge.color,
                                fontSize: "12px",
                                fontWeight: "600",
                              }}
                            >
                              {badge.label} urgency
                            </span>
                          );
                        })()}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#666",
                          marginTop: "5px",
                        }}
                      >
                        Age: {req.createdBy?.age ?? "N/A"}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#999",
                          marginTop: "3px",
                        }}
                      >
                        Posted: {new Date(req.createdAt).toLocaleString()}
                      </div>
                      {req.distance != null && (
                        <div>
                          Distance: {(req.distance / 1000).toFixed(2)} km
                        </div>
                      )}

                      {req.isCompleted && (
                        <div style={{ color: "green", fontWeight: "bold" }}>
                          Solved ✓
                        </div>
                      )}

                      {isExpanded && (
                        <>
                          <hr />
                          <p>{req.description}</p>

                          {!isOwner && !req.isCompleted && !hasHelper && (
                            <button
                              type="button"
                              onClick={(e) => handleWantToHelp(req._id, e)}
                            >
                              I want to help
                            </button>
                          )}

                          {isOwner && !req.isCompleted && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkCompleted(req._id, e)}
                            >
                              Mark as completed
                            </button>
                          )}

                          {canChat && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenChat(req);
                              }}
                              style={{
                                padding: "8px 16px",
                                backgroundColor: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                marginLeft: "8px",
                              }}
                            >
                              Open chat
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {chatNotification && (
        <div
          onClick={() => {
            if (chatNotification.chatId && chatNotification.requestId) {
              const summary = chatSummaries.find(
                (c) => c.id === chatNotification.chatId
              );
              if (summary) {
                const currentUserId = currentUser?.id || currentUser?._id;
                const fallbackOther = chatNotification.otherUser ||
                  (summary.participants || []).find(
                    (p) => (p._id || p.id) && (p._id || p.id) !== currentUserId
                  ) || { _id: "deleted", name: "Deleted user" };
                setActiveChat({
                  chatId: summary.id,
                  otherUser: fallbackOther,
                  requestTitle: summary.requestTitle,
                  requestId: summary.requestId,
                });
                const lastSeen =
                  chatNotification.lastId ||
                  summary?.lastMessage?._id ||
                  summary?.lastMessage?.createdAt;
                if (lastSeen) {
                  lastNotifiedRef.current[summary.id] = lastSeen;
                  localStorage.setItem(
                    "lastNotifiedChatMsg",
                    JSON.stringify(lastNotifiedRef.current)
                  );
                }
                setIsChatOpen(true);
              }
            }
            setChatNotification("");
          }}
          style={{
            position: "fixed",
            bottom: "80px",
            right: "16px",
            background: "#fff3cd",
            color: "#856404",
            padding: "10px 14px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
            cursor: "pointer",
          }}
        >
          {chatNotification.text || chatNotification}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setChatNotification("");
            }}
            style={{
              marginLeft: "10px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ×
          </button>
        </div>
      )}

      {activeChat && (
        <ChatWindow
          chatId={activeChat.chatId}
          currentUser={currentUser}
          otherUser={activeChat.otherUser}
          requestTitle={activeChat.requestTitle}
          requestId={activeChat.requestId}
          visible={isChatOpen}
          onNewMessage={({ from, requestTitle, messageId }) => {
            if (activeChat && isChatOpen) {
              if (messageId) {
                lastNotifiedRef.current[activeChat.chatId] = messageId;
                localStorage.setItem(
                  "lastNotifiedChatMsg",
                  JSON.stringify(lastNotifiedRef.current)
                );
              }
              return;
            }
            setChatNotification({
              text: `You have a new message from ${from} about "${
                requestTitle || "a request"
              }"`,
              chatId: activeChat.chatId,
              requestId: activeChat.requestId,
              requestTitle,
              otherUser: activeChat.otherUser,
            });
          }}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      <Footer />
    </div>
  );
}

export default Home;

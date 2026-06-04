import React, { useEffect, useRef, useState } from "react";
import "./ChatWindow.css";
import { API_URL, completeRequest, flagUserInChat } from "../../src/Api";
import { getSocket } from "../../src/socket";

function ChatWindow({
  chatId,
  currentUser,
  otherUser,
  requestTitle,
  requestId,
  isReadOnly,
  onClose,
  onNewMessage,
  visible = true,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [serverClosed, setServerClosed] = useState(false);
  const [hasFlagged, setHasFlagged] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const lastOtherMessageRef = useRef(null);
  const initialLoadRef = useRef(true);
  const completionTimerRef = useRef(null);
  const joinedChatRef = useRef(null);

  const currentUserId = currentUser?._id || currentUser?.id;
  const otherUserAvatar = otherUser?.profileImage || "/logo.png";
  const currentUserAvatar = currentUser?.profileImage || "/logo.png";
  const otherUserId = otherUser?._id || otherUser?.id;
  const effectiveReadOnly = Boolean(isReadOnly || serverClosed);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    setShowCompletionPrompt(false);
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (chatId) {
      completionTimerRef.current = setTimeout(() => {
        setShowCompletionPrompt(true);
      }, 4 * 60 * 60 * 1000);
    }
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, [chatId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;

    async function fetchMessages() {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_URL}/chats/${chatId}/messages`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          console.error("Error fetching messages:", data);
          return;
        }

        const msgs = Array.isArray(data.messages) ? data.messages : [];
        if (cancelled) return;
        setMessages(msgs);
        setServerClosed(Boolean(data.isClosed));
        setHasFlagged(Boolean(data.hasFlagged));
        const latest = msgs[msgs.length - 1];
        lastOtherMessageRef.current = latest?._id || latest?.createdAt || null;
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          initialLoadRef.current = false;
        }
      }
    }

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    const token = localStorage.getItem("token");
    const socket = getSocket(token);
    if (!socket) return;

    socket.emit("chat:join", { chatId }, (response) => {
      if (response?.error) {
        console.error("Failed to join chat room:", response.error);
      } else {
        joinedChatRef.current = chatId;
      }
    });

    const handleMessage = (payload) => {
      if (payload?.chatId !== chatId || !payload?.message) return;

      setMessages((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const existingIndex = next.findIndex(
          (message) => message._id && message._id === payload.message._id
        );
        if (existingIndex >= 0) {
          next[existingIndex] = payload.message;
        } else {
          next.push(payload.message);
        }
        return next;
      });
      setServerClosed(Boolean(payload.isClosed));

      const messageId = payload.message._id || payload.message.createdAt;
      const senderId =
        typeof payload.message.sender === "string"
          ? payload.message.sender
          : payload.message.sender?._id;

      if (
        senderId &&
        senderId !== currentUserId &&
        lastOtherMessageRef.current !== messageId
      ) {
        lastOtherMessageRef.current = messageId;
        onNewMessage?.({
          from: payload.message.sender?.name || otherUser?.name || "Someone",
          requestTitle: payload.requestTitle || requestTitle,
          chatId,
          requestId,
          otherUser,
          messageId,
        });
      }
    };

    const handleClosed = (payload) => {
      if (payload?.chatId === chatId) {
        setServerClosed(true);
      }
    };

    socket.on("chat:message", handleMessage);
    socket.on("chat:closed", handleClosed);

    return () => {
      socket.off("chat:message", handleMessage);
      socket.off("chat:closed", handleClosed);
      if (joinedChatRef.current) {
        socket.emit("chat:leave", { chatId: joinedChatRef.current });
        joinedChatRef.current = null;
      }
    };
  }, [chatId, currentUserId, onNewMessage, otherUser, requestId, requestTitle]);

  async function handleSend(e) {
    e.preventDefault();
    const textToSend = text.trim();
    if ((attachments.length === 0 && !textToSend) || effectiveReadOnly) return;

    try {
      setSending(true);
      const token = localStorage.getItem("token");
      const socket = getSocket(token);
      if (!socket) {
        throw new Error("No active socket connection");
      }

      const result = await new Promise((resolve) => {
        socket.emit("chat:send-message", {
          chatId,
          text: textToSend,
          attachments,
        }, resolve);
      });

      if (result?.error) {
        console.error("Error sending message:", result);
        alert(result.error || "Failed to send message");
        return;
      }

      setText("");
      setAttachments([]);
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Error sending message");
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;
    setUploadError("");

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("File too large. Maximum 100MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/chats/${chatId}/attachments`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Upload failed:", data);
        alert(data.error || "Upload failed");
        return;
      }

      setAttachments((prev) => [...prev, data]);
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Error uploading file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const senderId = lastMessage?.sender?._id || lastMessage?.sender;

    if (senderId && senderId !== currentUserId) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New message", {
          body: lastMessage.text,
        });
      }
    }
  }, [messages, currentUserId]);

  let otherUserName =
    otherUser?.name || otherUser?.firstname || otherUser?.email || "User";

  if (!otherUserName && messages.length > 0) {
    const otherMsg = messages.find((msg) => {
      const senderId = typeof msg.sender === "string" ? msg.sender : msg.sender?._id;
      return senderId && senderId !== currentUserId;
    });
    if (otherMsg?.sender) {
      otherUserName =
        otherMsg.sender.name ||
        otherMsg.sender.firstname ||
        otherMsg.sender.email ||
        "User";
    }
  }

  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div
      className={`chat-window ${expanded ? "expanded" : ""}`}
      style={{ display: visible ? "flex" : "none" }}
    >
      <div className="chat-header">
        <div className="chat-title">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img
              src={otherUserAvatar}
              alt={otherUserName}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", background: "#fff", cursor: "zoom-in" }}
              onError={(e) => (e.target.src = "/logo.png")}
              onDoubleClick={() => setPreviewAvatar(otherUserAvatar)}
            />
            <div>
              {requestTitle && (
                <div style={{ fontWeight: "bold", fontSize: "13px" }}>
                  Chat about: {requestTitle}
                </div>
              )}
              <div style={{ fontSize: "12px" }}>With {otherUserName}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {!hasFlagged && (
            <button
              className="chat-toggle"
              onClick={async () => {
                if (!chatId || !otherUserId || flagging) return;
                const ok = window.confirm("Flag this user? This will be reviewed by admins.");
                if (!ok) return;
                try {
                  setFlagging(true);
                  const token = localStorage.getItem("token");
                  await flagUserInChat({
                    chatId,
                    targetUserId: otherUserId,
                    token,
                  });
                  setHasFlagged(true);
                  alert("User flagged. Thank you!");
                } catch (err) {
                  alert(err.message || "Failed to flag user");
                } finally {
                  setFlagging(false);
                }
              }}
              title="Flag user"
              disabled={!otherUserId || flagging}
            >
              {flagging ? "Flagging..." : "Flag"}
            </button>
          )}
          <button
            className="chat-toggle"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        <button className="chat-close" onClick={onClose}>
          ×
        </button>
        </div>
      </div>

      <div className="chat-messages">
        {loading && safeMessages.length === 0 && (
          <div className="chat-info">Loading messages…</div>
        )}

        {safeMessages.map((msg, index) => {
          const senderId = typeof msg.sender === "string" ? msg.sender : msg.sender?._id;
          const isMine = senderId && senderId === currentUserId;
          const senderName = isMine ? "You" : otherUserName;
          const avatarSrc = isMine
            ? currentUserAvatar
            : (typeof msg.sender === "object" && msg.sender?.profileImage) || otherUserAvatar;

          return (
            <div
              key={msg._id || index}
              className={`chat-message ${isMine ? "mine" : "theirs"}`}
            >
              <img
                src={avatarSrc}
                alt={senderName}
                className="chat-avatar"
                onError={(e) => (e.target.src = "/logo.png")}
                onDoubleClick={() => setPreviewAvatar(avatarSrc)}
              />
              <div className="chat-bubble">
                {msg.text && <div className="chat-text">{msg.text}</div>}
                {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                  <div className="chat-attachments">
                    {msg.attachments.map((att, i) => (
                      <div key={i} className="chat-attachment">
                        {att.type === "image" ? (
                          <img
                            src={att.url}
                            alt={att.originalName || "image"}
                            onDoubleClick={() => setPreviewAttachment(att.url)}
                          />
                        ) : att.type === "video" ? (
                          <video src={att.url} controls />
                        ) : (
                          <a href={att.url} target="_blank" rel="noreferrer">
                            {att.originalName || "Download file"}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="chat-meta">
                  {senderName}
                  {msg.createdAt && (
                    <>
                      {" · "}
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {effectiveReadOnly ? (
        <div className="chat-input-area" style={{ justifyContent: "center", color: "#666" }}>
          <div className="chat-info" style={{ fontSize: "12px" }}>
            This chat is closed. Messages are read-only.
          </div>
        </div>
      ) : (
        <>
      <form className="chat-input-area" onSubmit={handleSend}>
            <textarea
              rows={3}
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={sending}
              ref={inputRef}
              className="chat-textarea"
            />
            <label className="chat-attach">
              📎
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} disabled={uploading || sending} />
            </label>
            <button type="submit" disabled={sending || (!text.trim() && attachments.length === 0)}>
              {sending ? "..." : "Send"}
            </button>
          </form>
          {(uploading || attachments.length > 0) && (
            <div className="chat-info" style={{ marginBottom: "6px" }}>
              {uploading ? "Uploading…" : uploadError || "Attached"}
              {attachments.length > 0 && (
                <div className="chat-attachments" style={{ justifyContent: "center" }}>
                  {attachments.map((att, idx) => (
                    <div key={idx} className="chat-attachment">
                      {att.type === "image" ? (
                        <img src={att.url} alt={att.originalName || "attachment"} />
                      ) : att.type === "video" ? (
                        <video src={att.url} controls />
                      ) : (
                        <a href={att.url} target="_blank" rel="noreferrer">
                          {att.originalName || "File"}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!uploading && uploadError && (
            <div className="chat-info" style={{ color: "#dc2626", marginBottom: "6px" }}>
              {uploadError}
            </div>
          )}
        </>
      )}
      {(previewAttachment || previewAvatar) && (
        <div className="chat-preview-overlay" onClick={() => { setPreviewAttachment(null); setPreviewAvatar(null); }}>
          <img src={previewAttachment || previewAvatar} alt="preview" />
        </div>
      )}

      {showCompletionPrompt && requestId && (
        <div className="chat-reminder">
          <div>Has this request been solved? If yes, mark it as completed.</div>
          <div className="chat-reminder-actions">
            <button
              type="button"
              onClick={async () => {
                const token = localStorage.getItem("token");
                try {
                  await completeRequest(requestId, token);
                } catch (err) {
                  console.warn("Failed to mark complete from reminder:", err);
                } finally {
                  setShowCompletionPrompt(false);
                }
              }}
            >
              Mark as solved
            </button>
            <button type="button" onClick={() => setShowCompletionPrompt(false)}>
              Keep it open
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;

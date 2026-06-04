import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../src/Authcontext";
import {
  adminGetUsers,
  adminBanUser,
  adminUnbanUser,
  adminApproveIdentity,
  adminRejectIdentity,
  adminGetRequests,
  adminDeleteRequest,
} from "../src/Api";

function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    async function load() {
      if (!isAdmin || !token) return;
      setLoading(true);
      setError("");
      try {
        const [usersData, requestsData] = await Promise.all([
          adminGetUsers(token),
          adminGetRequests(token),
        ]);
        setUsers(usersData);
        setRequests(requestsData);
      } catch (err) {
        console.error("Admin load error:", err);
        setError(err.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin, token]);

  if (!isAdmin) {
    return (
      <div className="page-container">
        <Header />
        <div className="content" style={{ padding: "20px" }}>
          You need admin role to view this page.
        </div>
        <Footer />
      </div>
    );
  }

  async function handleBan(id) {
    const freshToken = localStorage.getItem("token");
    try {
      const updated = await adminBanUser(id, freshToken);
      if (updated && (updated._id || updated.id)) {
        const updatedId = updated._id || updated.id;
        setUsers((prev) =>
          prev.map((u) =>
            u._id === updatedId || u.id === updatedId || u._id === id
              ? { ...u, ...updated }
              : u
          )
        );
      }
      const usersData = await adminGetUsers(freshToken);
      setUsers(usersData);
    } catch (err) {
      alert(err.message || "Failed to ban user");
    }
  }

  async function handleUnban(id) {
    const freshToken = localStorage.getItem("token");
    try {
      const updated = await adminUnbanUser(id, freshToken);
      if (updated && (updated._id || updated.id)) {
        const updatedId = updated._id || updated.id;
        setUsers((prev) =>
          prev.map((u) =>
            u._id === updatedId || u.id === updatedId || u._id === id
              ? { ...u, ...updated }
              : u
          )
        );
      }
      const usersData = await adminGetUsers(freshToken);
      setUsers(usersData);
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) =>
          u._id === id || u.id === id ? { ...u, isBanned: false } : u
        )
      );
      alert(err.message || "Failed to unban user");
    }
  }

  async function handleApproveIdentity(id) {
    const freshToken = localStorage.getItem("token");
    try {
      const updated = await adminApproveIdentity(id, freshToken);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, ...updated } : u)));
    } catch (err) {
      alert(err.message || "Failed to approve identity");
    }
  }

  async function handleRejectIdentity(id) {
    const reason = window.prompt("Why reject this identity verification?", "Document or selfie could not be verified");
    if (reason == null) return;
    const freshToken = localStorage.getItem("token");
    try {
      const updated = await adminRejectIdentity(id, freshToken, reason);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, ...updated } : u)));
    } catch (err) {
      alert(err.message || "Failed to reject identity");
    }
  }

  async function handleDeleteRequest(id) {
    if (!window.confirm("Delete this request?")) return;
    try {
      await adminDeleteRequest(id, token);
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert(err.message || "Failed to delete request");
    }
  }

  return (
    <div className="page-container">
      <Header />
      <div className="content" style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
        <h1>Admin</h1>
        {error && <div style={{ color: "red", marginBottom: "12px" }}>{error}</div>}
        {loading && <div>Loading…</div>}

        <section style={{ marginBottom: "24px" }}>
          <h2>Users</h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {users.map((u) => (
              <div key={u._id} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <img
                    src={u.profileImage || "/logo.png"}
                    alt={u.name}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", background: "#f3f4f6" }}
                    onError={(e) => (e.target.src = "/logo.png")}
                  />
                  <div>
                    <div><strong>{u.name}</strong> ({u.email})</div>
                    <div style={{ fontSize: "12px", color: "#555" }}>
                      Role: {u.role} · Flags: {u.flagsCount || 0} · {u.isBanned ? "BANNED — contact support to unban: makeamitsva@gmail.com" : "Active"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#555" }}>
                      Identity: {u.identityStatus || "not_started"}
                      {u.identitySubmittedAt ? ` · Submitted: ${new Date(u.identitySubmittedAt).toLocaleDateString()}` : ""}
                    </div>
                    {(u.identityDocumentUrl || u.identitySelfieUrl || u.identityVideoUrl) && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "6px", fontSize: "12px" }}>
                        {u.identityDocumentUrl && <a href={u.identityDocumentUrl} target="_blank" rel="noreferrer">ID document</a>}
                        {u.identitySelfieUrl && <a href={u.identitySelfieUrl} target="_blank" rel="noreferrer">Selfie</a>}
                        {u.identityVideoUrl && <a href={u.identityVideoUrl} target="_blank" rel="noreferrer">Name video</a>}
                      </div>
                    )}
                    {u.identityLastError && (
                      <div style={{ fontSize: "12px", color: "#b00020" }}>{u.identityLastError}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {u.identityStatus === "pending" && (
                    <>
                      <button onClick={() => handleApproveIdentity(u._id)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "6px" }}>
                        Approve ID
                      </button>
                      <button onClick={() => handleRejectIdentity(u._id)} style={{ background: "#f59e0b", color: "#111", border: "none", padding: "6px 10px", borderRadius: "6px" }}>
                        Reject ID
                      </button>
                    </>
                  )}
                  {!u.isBanned ? (
                    <button onClick={() => handleBan(u._id)} style={{ background: "#e53935", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "6px" }}>
                      Ban
                    </button>
                  ) : (
                    <button onClick={() => handleUnban(u._id)} style={{ background: "#4caf50", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "6px" }}>
                      Unban
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Requests</h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {requests.map((r) => (
              <div key={r._id} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div><strong>{r.title}</strong></div>
                  <div style={{ fontSize: "12px", color: "#555" }}>
                    Creator: {r.createdBy?.name || "Unknown"} · Completed: {r.isCompleted ? "Yes" : "No"}
                  </div>
                </div>
                <button onClick={() => handleDeleteRequest(r._id)} style={{ background: "#e53935", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "6px" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

export default Admin;

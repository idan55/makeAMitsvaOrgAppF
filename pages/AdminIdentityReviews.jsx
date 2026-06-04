import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../src/Authcontext";
import {
  adminApproveIdentity,
  adminGetPendingIdentityReviews,
  adminRejectIdentity,
} from "../src/Api";

function AdminIdentityReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");

  const token = localStorage.getItem("token");
  const isAdmin = user?.role === "admin";
  const selectedReview = useMemo(
    () => reviews.find((review) => review._id === selectedId) || reviews[0],
    [reviews, selectedId]
  );

  async function loadReviews() {
    if (!isAdmin || !token) return;
    setLoading(true);
    setError("");
    try {
      const data = await adminGetPendingIdentityReviews(token);
      setReviews(data);
      setSelectedId((current) =>
        current && data.some((review) => review._id === current)
          ? current
          : data[0]?._id || ""
      );
    } catch (err) {
      setError(err.message || "Failed to load identity reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [isAdmin, token]);

  async function approve(id) {
    setBusyId(id);
    try {
      await adminApproveIdentity(id, token);
      setReviews((prev) => prev.filter((review) => review._id !== id));
    } catch (err) {
      alert(err.message || "Failed to approve identity");
    } finally {
      setBusyId("");
    }
  }

  async function reject(id) {
    const reason = window.prompt(
      "Why reject this identity verification?",
      "The submitted documents could not be verified"
    );
    if (reason == null) return;
    setBusyId(id);
    try {
      await adminRejectIdentity(id, token, reason);
      setReviews((prev) => prev.filter((review) => review._id !== id));
    } catch (err) {
      alert(err.message || "Failed to reject identity");
    } finally {
      setBusyId("");
    }
  }

  if (!isAdmin) {
    return (
      <div className="page-container">
        <Header />
        <main className="admin-review-page">
          <div className="empty-state">You need admin role to view this page.</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />
      <main className="admin-review-page">
        <section className="admin-review-shell">
          <div className="admin-review-header">
            <div>
              <p className="identity-kicker">Admin review</p>
              <h1>Identity verification queue</h1>
              <p>Review each ID document, selfie, and spoken-name video before approving access.</p>
            </div>
            <button className="identity-secondary" onClick={loadReviews} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && <div className="review-alert review-alert-error">{error}</div>}

          {reviews.length === 0 && !loading ? (
            <div className="empty-state">
              <h2>No pending reviews</h2>
              <p>When users submit identity documents, they will appear here.</p>
            </div>
          ) : (
            <div className="review-layout">
              <aside className="review-list">
                {reviews.map((review) => (
                  <button
                    type="button"
                    key={review._id}
                    className={`review-list-item ${selectedReview?._id === review._id ? "active" : ""}`}
                    onClick={() => setSelectedId(review._id)}
                  >
                    <img src={review.profileImage || "/logo.png"} alt={review.name} />
                    <span>
                      <strong>{review.name}</strong>
                      <small>{review.email}</small>
                    </span>
                  </button>
                ))}
              </aside>

              {selectedReview && (
                <article className="review-detail">
                  <div className="review-user-bar">
                    <div>
                      <h2>{selectedReview.name}</h2>
                      <p>{selectedReview.email} · {selectedReview.phone}</p>
                      <p>
                        Submitted{" "}
                        {selectedReview.identitySubmittedAt
                          ? new Date(selectedReview.identitySubmittedAt).toLocaleString()
                          : "recently"}
                      </p>
                    </div>
                    <span className="identity-status identity-status-pending">pending</span>
                  </div>

                  <div className="review-media-grid">
                    <a className="review-media-card" href={selectedReview.identityDocumentUrl} target="_blank" rel="noreferrer">
                      <span>ID document</span>
                      <img src={selectedReview.identityDocumentUrl} alt="ID document" />
                    </a>
                    <a className="review-media-card" href={selectedReview.identitySelfieUrl} target="_blank" rel="noreferrer">
                      <span>Selfie</span>
                      <img src={selectedReview.identitySelfieUrl} alt="Selfie" />
                    </a>
                    <div className="review-media-card review-video-card">
                      <span>Name video</span>
                      <video src={selectedReview.identityVideoUrl} controls preload="metadata" />
                      <a href={selectedReview.identityVideoUrl} target="_blank" rel="noreferrer">
                        Open video in new tab
                      </a>
                    </div>
                  </div>

                  <div className="review-checklist">
                    <strong>Before approving</strong>
                    <p>Name and face should match the ID, selfie should match the ID photo, and the video should clearly say the user&apos;s first and last name.</p>
                  </div>

                  <div className="review-actions">
                    <button
                      className="review-reject"
                      onClick={() => reject(selectedReview._id)}
                      disabled={busyId === selectedReview._id}
                    >
                      Reject
                    </button>
                    <button
                      className="review-approve"
                      onClick={() => approve(selectedReview._id)}
                      disabled={busyId === selectedReview._id}
                    >
                      Approve
                    </button>
                  </div>
                </article>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default AdminIdentityReviews;

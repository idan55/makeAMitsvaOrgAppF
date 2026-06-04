import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getIdentityStatus, submitIdentityVerification } from "../src/Api";
import { useAuth } from "../src/Authcontext";

function VerifyIdentity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documentFile, setDocumentFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [status, setStatus] = useState(user?.identityStatus || "not_started");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const data = await getIdentityStatus(token);
        setStatus(data.identityStatus || "not_started");
      } catch (err) {
        setError(err.message || "Failed to load identity status");
      }
    }
    loadStatus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!documentFile || !selfieFile || !videoFile) {
      setError("Please upload your ID document, selfie, and verification video.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await submitIdentityVerification({
        documentFile,
        selfieFile,
        videoFile,
        token,
      });
      setStatus(data.status || "pending");
      setMessage("Verification submitted. An admin will review it soon.");
    } catch (err) {
      setError(err.message || "Failed to submit verification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <Header />
      <div className="identity-page">
        <div className="identity-panel">
          <div className="identity-header">
            <div>
              <p className="identity-kicker">Account security</p>
              <h1>Identity verification</h1>
            </div>
            <span className={`identity-status identity-status-${status}`}>
              {status.replace("_", " ")}
            </span>
          </div>

          <div className="identity-intro">
            <p>
              Upload a clear ID document, a selfie, and a short video saying your
              first and last name. An admin will review the files before your
              account can create or help with requests.
            </p>
          </div>

        {status === "verified" ? (
          <div className="identity-success">
            <h2>Verification approved</h2>
            <p>Your account is ready to use.</p>
            <button onClick={() => navigate("/")} className="submit-button">
              Continue
            </button>
          </div>
        ) : (
          <form className="identity-form" onSubmit={handleSubmit}>
            <div className="identity-upload-grid">
              <label className="identity-upload">
                <span className="identity-upload-step">1</span>
                <strong>ID document</strong>
                <small>Passport, ID card, or driver license. Make sure all corners are visible.</small>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  required
                />
                <em>{documentFile ? documentFile.name : "Choose image"}</em>
              </label>

              <label className="identity-upload">
                <span className="identity-upload-step">2</span>
                <strong>Selfie</strong>
                <small>Use a recent, well-lit photo with your face clearly visible.</small>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                  required
                />
                <em>{selfieFile ? selfieFile.name : "Choose image"}</em>
              </label>

              <label className="identity-upload identity-upload-wide">
                <span className="identity-upload-step">3</span>
                <strong>Name confirmation video</strong>
                <small>Record 5-10 seconds saying: "My name is [first name] [last name]."</small>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  required
                />
                <em>{videoFile ? videoFile.name : "Choose video"}</em>
              </label>
            </div>

            <div className="identity-actions">
              <button type="button" onClick={() => navigate("/")} className="identity-secondary">
                Later
              </button>
              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? "Submitting..." : "Submit for review"}
              </button>
            </div>
          </form>
        )}
          {message && <p className="identity-message identity-message-success">{message}</p>}
          {error && <p className="identity-message identity-message-error">{error}</p>}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default VerifyIdentity;

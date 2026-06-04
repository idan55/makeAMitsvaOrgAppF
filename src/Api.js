export const API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL_ENV) ||
  (typeof process !== "undefined" && process.env?.VITE_API_URL_ENV) ||
  "http://localhost:4000/api";

export async function registerUser({
  name,
  age,
  email,
  password,
  phone,
  profileImage,
}) {
  const res = await fetch(`${API_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      age: Number(age),
      email,
      password,
      phone,
      profileImage,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Registration failed");
  }

  return data;
}

export async function LoginUser({ email, password }) {
  const res = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error || "Login failed");
    error.status = res.status;
    throw error;
  }

  return data;
}

export async function getMe(token) {
  const res = await fetch(`${API_URL}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load user");
  return data.user;
}

export async function updateProfileImage({ profileImage, token }) {
  const res = await fetch(`${API_URL}/users/profile-image`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ profileImage }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update profile image");
  return data.user;
}

export async function adminGetUsers(token) {
  const res = await fetch(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load users");
  return data.users;
}

export async function adminBanUser(id, token) {
  const res = await fetch(`${API_URL}/admin/users/${id}/ban`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to ban user");
  return data.user || data.updatedUser || data.data || data;
}

export async function adminUnbanUser(id, token) {
  const res = await fetch(`${API_URL}/admin/users/${id}/unban`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to unban user");
  return data.user || data.updatedUser || data.data || data;
}

export async function adminGetPendingIdentityReviews(token) {
  const res = await fetch(`${API_URL}/admin/identity/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to load identity reviews");
  }
  return data.users;
}

export async function adminApproveIdentity(id, token) {
  const res = await fetch(`${API_URL}/admin/users/${id}/identity/approve`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve identity");
  return data.user || data;
}

export async function adminRejectIdentity(id, token, reason) {
  const res = await fetch(`${API_URL}/admin/users/${id}/identity/reject`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reject identity");
  return data.user || data;
}

export async function adminGetRequests(token) {
  const res = await fetch(`${API_URL}/admin/requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load requests");
  return data.requests;
}

export async function adminDeleteRequest(id, token) {
  const res = await fetch(`${API_URL}/admin/requests/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete request");
  return data;
}

export async function deleteMyAccount({ userId, token }) {
  const res = await fetch(`${API_URL}/users/delete/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete account");
  return data;
}

export async function createRequest({
  title,
  description,
  latitude,
  longitude,
  urgency = "normal",
  token,
}) {
  const res = await fetch(`${API_URL}/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, latitude, longitude, urgency }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create request");
  return data;
}

export async function submitIdentityVerification({ documentFile, selfieFile, videoFile, token }) {
  const formData = new FormData();
  formData.append("document", documentFile);
  formData.append("selfie", selfieFile);
  formData.append("video", videoFile);

  const res = await fetch(`${API_URL}/identity/manual`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || "Failed to submit identity verification");
    error.identityStatus = data.identityStatus;
    throw error;
  }
  return data;
}

export async function getIdentityStatus(token) {
  const res = await fetch(`${API_URL}/identity/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load identity status");
  return data;
}

export async function getNearbyRequests({ latitude, longitude, distanceKm }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    distanceInMeters: String(distanceKm * 1000),
  });

  const res = await fetch(`${API_URL}/requests/nearby?${params.toString()}`);

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch nearby requests");
  return data;
}

export async function wantToHelpRequest(id, token) {
  const res = await fetch(`${API_URL}/requests/${id}/help`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to mark as helper");
  return data;
}

export async function completeRequest(id, token) {
  const res = await fetch(`${API_URL}/requests/${id}/complete`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to mark completed");
  return data;
}

export async function getMyOpenRequests(token) {
  const res = await fetch(`${API_URL}/requests/my-open`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch my open requests");
  return data;
}

export async function getRequestsISolved(token) {
  const res = await fetch(`${API_URL}/requests/i-solved`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch solved requests");
  return data;
}

export async function startChat({ otherUserId, requestId, token }) {
  const res = await fetch(`${API_URL}/chats/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ otherUserId, requestId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to start chat");
  }

  return data;
}

export async function listMyChats(token) {
  const res = await fetch(`${API_URL}/chats/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load chats");
  return data.chats;
}

export async function flagUserInChat({ chatId, targetUserId, token }) {
  const res = await fetch(`${API_URL}/chats/${chatId}/flag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetUserId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to flag user");
  return data;
}

export async function getMyCompletedRequests(token) {
  const res = await fetch(`${API_URL}/requests/my-completed`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to fetch my completed requests");
  return data;
}

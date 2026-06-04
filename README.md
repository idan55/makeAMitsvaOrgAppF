# Make A Mitsva Frontend Book

This document is a full walkthrough of the Make A Mitsva frontend. It describes how the app boots, how state flows through the UI, and how every page and component works. Use it as a reference when maintaining or extending the client side.

## Table of Contents
1. Purpose and Product Overview
2. Architecture at a Glance
3. Boot Sequence and Routing
4. Global Auth and Storage
5. API Layer and Data Shapes
6. Pages
7. Shared Components
8. Chat System
9. Map and Geo Behavior
10. Forms, Validation, and Uploads
11. Styling and Layout
12. Environment Configuration
13. Build, Preview, and Deployment

## 1) Purpose and Product Overview
Make A Mitsva is a React + Vite single-page application. The app connects people who need help with volunteers nearby. Users can:
- Register and login
- Create help requests (mitzvot) tied to their location
- Discover nearby requests on a map and list
- Volunteer for requests and confirm completion
- Chat with the other party once a request is claimed
- Manage their profile and see their request history
- Use an admin panel to moderate users and requests

The frontend is primarily responsible for:
- Session and user persistence
- Client-side validation and request orchestration
- Map visualization and list synchronization
- Chat polling and notification UX
- Admin tooling UX

## 2) Architecture at a Glance
The app is divided into three layers:
- UI pages in `pages/` for major routes
- Shared UI components in `components/`
- Utilities and API helpers in `src/`

Core entry points:
- `index.html` provides the root DOM node.
- `src/main.jsx` mounts the React application.
- `src/App.jsx` defines routes and wraps everything in `AuthProvider`.

## 3) Boot Sequence and Routing
Boot flow:
1. `src/main.jsx` mounts `<App />` inside React `StrictMode`.
2. `src/App.jsx` wraps the router in `AuthProvider`.
3. The router defines routes for Home, Register, Login, My Account, Admin, and a catch-all redirect to `/`.

Routes:
- `/` -> `pages/Home.jsx`
- `/register` -> `pages/Register.jsx`
- `/login` -> `pages/Login.jsx`
- `/myaccount` -> `pages/Myaccount.jsx`
- `/admin` -> `pages/Admin.jsx`
- `*` -> redirects to `/`

Because the app uses client-side routing, production hosting must rewrite unknown routes to `/`. `static.json` provides a universal rewrite for static hosts.

## 4) Global Auth and Storage
Auth is provided by `src/Authcontext.jsx`.

State:
- `user`: The current user object or null.
- `token`: The bearer token or null.

Persistence:
- On first load, the provider reads `localStorage.user` and `localStorage.token`.
- If present, it restores them and then attempts to refresh the user via `getMe`.
- It updates storage whenever a fresh user is fetched.

Actions:
- `login(userData)` supports two shapes:
  - `{ user, token }`: full auth response (login/register)
  - `user`: direct user object (refreshes or updates)
- `logout()` clears state and localStorage.

LocalStorage keys used:
- `user`: JSON string of the user profile
- `token`: JWT or token string
- `lastNotifiedChatMsg`: map of `chatId -> lastMessageId` used for chat notifications

## 5) API Layer and Data Shapes
All HTTP calls are in `src/Api.js`. The API base URL uses `VITE_API_URL_ENV` with a localhost fallback.

Endpoints by feature:

User:
- `POST /users/register` -> `registerUser`
- `POST /users/login` -> `LoginUser`
- `GET /users/me` -> `getMe`
- `PATCH /users/profile-image` -> `updateProfileImage`
- `DELETE /users/delete/:id` -> `deleteMyAccount`

Admin:
- `GET /admin/users` -> `adminGetUsers`
- `PATCH /admin/users/:id/ban` -> `adminBanUser`
- `PATCH /admin/users/:id/unban` -> `adminUnbanUser`
- `GET /admin/requests` -> `adminGetRequests`
- `DELETE /admin/requests/:id` -> `adminDeleteRequest`

Requests:
- `POST /requests` -> `createRequest`
- `GET /requests/nearby` -> `getNearbyRequests`
- `PATCH /requests/:id/help` -> `wantToHelpRequest`
- `PATCH /requests/:id/complete` -> `completeRequest`
- `GET /requests/my-open` -> `getMyOpenRequests`
- `GET /requests/i-solved` -> `getRequestsISolved`
- `GET /requests/my-completed` -> `getMyCompletedRequests`

Chat:
- `POST /chats/start` -> `startChat`
- `GET /chats/my` -> `listMyChats`
- `GET /chats/:id/messages` -> fetch messages in `ChatWindow`
- `POST /chats/:id/messages` -> send messages in `ChatWindow`
- `POST /chats/:id/attachments` -> upload attachments in `ChatWindow`

Common data shapes (frontend expectations):

User:
- `_id` or `id`
- `name`, `email`, `age`, `phone`, `profileImage`
- `role` for admin access
- `isBanned` to lock access
- `stars` for progress indicator

Request:
- `_id`
- `title`, `description`, `urgency`
- `createdAt`, `updatedAt`
- `createdBy` (user or id)
- `completedBy` (user or id)
- `isCompleted`
- `location.coordinates` (lng, lat)
- `distance` in meters for nearby results

Chat summary:
- `id` (chatId)
- `requestId`, `requestTitle`
- `participants` list
- `lastMessage` with `_id`, `createdAt`, `sender`

Message:
- `_id`, `text`, `createdAt`
- `sender` object or id
- `attachments` list

Attachment:
- `type` of `image`, `video`, or `file`
- `url`, `originalName`

## 6) Pages

### Home (`pages/Home.jsx`)
Role: The main map and request hub. This is the most stateful page.

Key state:
- `userPos`: geolocation `[lat, lng]`
- `radiusKm`: search radius
- `requests`: current nearby results
- `selectedId`: currently expanded request
- `title`, `description`, `urgency`: new request form
- `activeChat`, `isChatOpen`: open chat state
- `chatSummaries` and `chatNotification`: chat list and notification
- `banFlashActive`, `showBanSupport`: ban overlay UX

Core effects and behavior:
- On mount, it fetches geolocation and restores chat notification state from localStorage.
- It fetches nearby requests whenever location or radius changes, then polls every 8 seconds.
- It polls chat summaries every 5 seconds to detect new incoming messages.
- It refreshes user state from the server before creating or claiming requests to catch new bans.
- It shows a flashing full-screen ban overlay, then a follow-up support screen.

Primary interactions:
- Create Request: requires login, location, and non-banned status.
- Help Request: sets current user as helper (claim).
- Mark Completed: creator confirms completion.
- Open Chat: determines the other participant based on role (creator or helper), then opens ChatWindow.

UI details:
- A radius slider controls request search.
- Map and list are shown side-by-side on desktop.
- List items expand when selected; map selection and list selection are synchronized.
- Urgency is displayed with colored badges.
- Request cards show distance, creator age, created date, and status.

### Register (`pages/Register.jsx`)
Role: New user onboarding with image upload and validation.

Key state:
- `name`, `age`, `email`, `password`, `phone`, `profileImage`
- `feedback`, `error`, `phoneError`, `isUploading`

Validation:
- Password must be 8+ chars, include uppercase and a number.
- Phone is normalized to Israeli format using `normalizeIsraeliPhone`.
- Profile image is required before submission.

Image upload:
- Client-side compression via canvas.
- Adaptive compression if file is larger than 2MB.
- Uploads to `POST /upload` on the backend (Cloudinary integration).

Flow:
1. Validate password and phone.
2. Ensure profile image is uploaded.
3. `registerUser` creates the account.
4. `LoginUser` logs in automatically and saves token.
5. Redirect to home.

### Login (`pages/Login.jsx`)
Role: Authenticate an existing user.

Key state:
- `email`, `password`, `error`, `loading`, `message`

Flow:
- Uses `LoginUser` and writes data via `AuthContext.login`.
- Redirects to home on success.
- Special error handling for deleted or banned accounts with clear support messaging.

### My Account (`pages/Myaccount.jsx`)
Role: Profile management and personal request history.

Key state:
- `myOpenRequests`, `mySolvedForOthers`, `myCompletedCreated`
- `imageError`, `isUploading`, `uploadFeedback`
- `activeChat`, `isChatOpen`, `chatNotification`

Behavior:
- On mount it loads all request lists and the latest user profile.
- It refreshes data on an 8-second interval for live updates.
- It updates profile image with two steps: upload to backend and then save on profile.
- It offers account deletion with confirmation.

Sections:
- Profile card with avatar viewer/editor and user fields.
- Stars progress bar with a reward banner after 500 stars.
- Horizontal carousels for:
  - My Open Requests (creator view)
  - Requests I Solved (helper view)
  - My Completed Requests (creator view)
- Chat access for solved requests, in read-only mode.

### Admin (`pages/Admin.jsx`)
Role: Admin-only moderation view.

Behavior:
- Only visible to `user.role === "admin"`.
- Loads all users and requests in parallel.
- Supports banning/unbanning users and deleting requests.
- Refetches user lists after ban actions to stay consistent with backend.

## 7) Shared Components

### Header (`components/Header.jsx`)
- Top navigation bar with logo and app title.
- Shows Register/Login when logged out.
- Shows My Account and Admin when logged in.
- Logout button clears local auth and routes to home.

### Footer (`components/Footer.jsx`)
- Displays GitHub and email support icons.
- Includes project copyright.

### Map (`components/Map.jsx`)
- Uses Mapbox GL and the `VITE_MAPBOX_TOKEN`.
- Initializes the map once and keeps a `markers` registry by request id.
- Recenters on user location and zooms in once the location is ready.
- Draws markers for requests with color-coded urgency.
- Popups show request details and a Google Maps directions link.
- Clicking a marker selects the related request card.
- When a request is selected in the list, the map flies to it and opens its popup.

### ChatWindow (`components/ChatWindow/ChatWindow.jsx`)
- Reusable chat UI with file attachments and rich previews.
- Polls messages every 800ms when a chat is open.
- Sends messages and attachments via the chat endpoints.
- Supports read-only mode when a request is completed.
- Shows an after-4-hours reminder to mark a request completed.
- Local browser notifications are used for new messages when permission is granted.

## 8) Chat System
Chat exists in two primary contexts:
- In Home, chats are opened from request cards.
- In My Account, chats are opened for completed requests as read-only.

Notification flow:
- The app polls `listMyChats` and tracks the latest message per chat.
- If a new message arrives and the chat is not open, a popup appears.
- The popup stores its state and can open the chat directly.
- LocalStorage stores `lastNotifiedChatMsg` to avoid repeated alerts.

Attachments:
- Users can attach images or videos up to 100MB.
- Attachments are uploaded before sending and then included in message payloads.

## 9) Map and Geo Behavior
Geolocation is required for nearby requests.
- On first load, the browser requests location permission.
- If blocked, the page shows an error and the map cannot load requests.

Radius behavior:
- Slider controls distance from 1km to 20km.
- The "Global requests" button sets the distance to 20000km.

Selection sync:
- Clicking a map marker selects and expands the related request card.
- Clicking a list card centers the map and opens the marker popup.

## 10) Forms, Validation, and Uploads

Phone normalization:
- Implemented in `src/phoneUtils.js`.
- Removes prefixes and ensures the number becomes `+9725XXXXXXXX`.
- Used in registration and in display formatting.

Password validation:
- Enforced client-side before registering.
- Requires 8+ chars, uppercase, and a digit.

Image uploads:
- Registration: requires a profile image and uses client-side compression.
- My Account: allows changing image and uploads to `/upload` before saving.

## 11) Styling and Layout
- Global styles in `src/App.css`.
- Component-specific styles in `components/ChatWindow/ChatWindow.css`.
- Most page layout uses inline styles for quick UI iteration.
- The layout is primarily flexbox-based with responsive adjustments for smaller screens.

Key global classes:
- `.page-container`, `.content`, `.site-footer`
- Map/list containers for Home view
- Request card styling and chat layout styles

## 12) Environment Configuration
Create a `.env` file in the project root:

```
VITE_API_URL_ENV=http://localhost:4000/api
VITE_MAPBOX_TOKEN=your_mapbox_token
```

The API base is read in `src/Api.js` and page-level upload helpers.

## 13) Build, Preview, and Deployment
Scripts:
- `npm run dev` runs Vite dev server with HMR.
- `npm run build` creates a production build.
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint.

Deployment notes:
- If hosting on a static host, configure a rewrite so all routes map to `/`.
- `static.json` already provides an all-routes rewrite for hosts that read it.
- Ensure `VITE_API_URL_ENV` points to the deployed backend base.


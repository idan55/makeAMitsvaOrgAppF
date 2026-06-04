import { io } from "socket.io-client";
import { API_URL } from "./Api";

const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

let socketInstance = null;
let activeToken = null;

export function getSocket(token) {
  if (!token) return null;

  if (socketInstance && activeToken === token) {
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  activeToken = token;
  socketInstance = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket"],
    auth: { token },
  });
  socketInstance.connect();

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    activeToken = null;
  }
}

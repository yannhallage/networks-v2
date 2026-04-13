/** Développement (`ng serve`, `ng build --configuration development`). */
export const environment = {
  production: false,
  /** WebSocket server-inspector en local. */
  wsUrl: 'wss://server-inspector.onrender.com',
  // wsUrl: 'ws://localhost:4000',
  reconnectDelayMs: 3000,
};

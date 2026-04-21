/** Développement (`ng serve`, `ng build --configuration development`). */
export const environment = {
  production: false,
  /** WebSocket server-inspector en local. */
  wsUrl: 'wss://81.0.220.161:4000',
  // wsUrl: 'ws://localhost:4000',
  reconnectDelayMs: 3000,
};

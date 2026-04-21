/** Production — `ng build` (configuration production). */
export const environment = {
  production: true,
  /**
   * Même hôte que https://server-inspector-production.up.railway.app/ (WSS).
   */
  wsUrl: 'wss://81.0.220.161:4000',
  reconnectDelayMs: 3000,
};

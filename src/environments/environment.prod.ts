/** Production — `ng build` (configuration production). */
export const environment = {
  production: true,
  /**
   * Même hôte que https://server-inspector-production.up.railway.app/ (WSS).
   */
  wsUrl: 'wss://server-inspector-production.up.railway.app',
  reconnectDelayMs: 3000,
};

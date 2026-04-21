/** Production — `ng build` (configuration production). */
export const environment = {
  production: true,
  /**
   * Même hôte que https://server-inspector-production.up.railway.app/ (WSS).
   */
  wsUrl: 'https://inspector-server.vercel.app',
  reconnectDelayMs: 3000,
};

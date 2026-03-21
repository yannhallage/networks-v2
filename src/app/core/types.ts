export type NetworkResourceType = 'fetch' | 'xhr' | 'script' | 'stylesheet';

export interface NetworkRequest {
  id: string;
  type: NetworkResourceType;
  url: string;
  method: string;
  status?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  duration?: number;
  timestamp: number;
  /** Libellés UI optionnels (démo ou extension) */
  displayName?: string;
  displaySize?: string;
  displayInitiator?: string;
}

/** Message serveur attendu pour les requêtes réseau capturées */
export interface NetworkRequestMessage {
  type: 'network_request';
  payload: NetworkRequest;
}

export type WsServerMessage = NetworkRequestMessage | { type: string; payload?: unknown };

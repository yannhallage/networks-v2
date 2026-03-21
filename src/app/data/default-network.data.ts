import type { NetworkRequest } from '../core/types';

/** Base de temps factice (ms) — les timestamps sont relatifs à cette époque pour le tri */
const T0 = 1_700_000_000_000;

/**
 * Jeu de requêtes par défaut (aucune extension / WebSocket requis pour l’instant).
 * Le store est initialisé avec cette liste.
 */
export const DEFAULT_NETWORK_REQUESTS: NetworkRequest[] = [
  {
    id: 'mock-3',
    type: 'script',
    url: 'https://localhost/main.js',
    method: 'GET',
    status: 200,
    timestamp: T0,
    duration: 45,
    displayName: 'main.js',
    displaySize: '42.1 kB',
    displayInitiator: 'index.html:12',
  },
  {
    id: 'mock-4',
    type: 'stylesheet',
    url: 'https://localhost/styles.css',
    method: 'GET',
    status: 200,
    timestamp: T0 + 5,
    duration: 32,
    displayName: 'styles.css',
    displaySize: '8.4 kB',
    displayInitiator: 'index.html:8',
  },
  {
    id: 'mock-1',
    type: 'fetch',
    url: 'https://api.example.com/9461cfa1-bd84-4c21-908f-2185020eca85',
    method: 'GET',
    status: 0,
    timestamp: T0 + 120,
    duration: 2070,
    displayName: '9461cfa1-bd84-4c21-908f-2185020eca85',
    displaySize: '0.0 kB',
    displayInitiator: 'contentScript.js:1',
  },
  {
    id: 'mock-5',
    type: 'fetch',
    url: 'https://localhost/api/data',
    method: 'GET',
    status: 200,
    timestamp: T0 + 200,
    duration: 120,
    displayName: 'api/data',
    displaySize: '1.2 kB',
    displayInitiator: 'app.js:102',
  },
  {
    id: 'mock-2',
    type: 'xhr',
    url: 'https://api.example.com/a12b3c4d-e5f6-7890-abcd-ef1234567890',
    method: 'GET',
    status: 0,
    timestamp: T0 + 400,
    duration: 1890,
    displayName: 'a12b3c4d-e5f6-7890-abcd-ef1234567890',
    displaySize: '0.0 kB',
    displayInitiator: 'contentScript.js:1',
  },
];

/** Jalons page (ms) — affichés sur le graphique Chart.js */
export const DEFAULT_PAGE_TIMINGS = {
  domContentLoadedMs: 978,
  loadEventMs: 1810,
} as const;

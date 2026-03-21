/** Ligne affichée dans le tableau et le waterfall (dérivée d’une requête ou des données démo) */
export interface NetworkRowView {
  id: string;
  name: string;
  status: string;
  statusFailed: boolean;
  type: string;
  initiator: string;
  size: string;
  timeMs: number;
  /** Début relatif au début de la session (ms) */
  startMs: number;
  durationMs: number;
  barClass: 'fetch' | 'xhr' | 'script' | 'stylesheet' | 'failed';
}

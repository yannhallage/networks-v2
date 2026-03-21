import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import type { NetworkRequest } from '../../core/types';

/** Ligne affichée (données réelles ou démo) */
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

const MOCK_ROWS: NetworkRowView[] = [
  {
    id: '1',
    name: '9461cfa1-bd84-4c21-908f-2185020eca85',
    status: '(failed) net::ERR_CONNECTION_REFUSED',
    statusFailed: true,
    type: 'fetch',
    initiator: 'contentScript.js:1',
    size: '0.0 kB',
    timeMs: 2070,
    startMs: 120,
    durationMs: 2070,
    barClass: 'failed',
  },
  {
    id: '2',
    name: 'a12b3c4d-e5f6-7890-abcd-ef1234567890',
    status: '(failed) net::ERR_CONNECTION_REFUSED',
    statusFailed: true,
    type: 'xhr',
    initiator: 'contentScript.js:1',
    size: '0.0 kB',
    timeMs: 1890,
    startMs: 400,
    durationMs: 1890,
    barClass: 'failed',
  },
  {
    id: '3',
    name: 'main.js',
    status: '200',
    statusFailed: false,
    type: 'script',
    initiator: 'index.html:12',
    size: '42.1 kB',
    timeMs: 45,
    startMs: 0,
    durationMs: 45,
    barClass: 'script',
  },
  {
    id: '4',
    name: 'styles.css',
    status: '200',
    statusFailed: false,
    type: 'stylesheet',
    initiator: 'index.html:8',
    size: '8.4 kB',
    timeMs: 32,
    startMs: 5,
    durationMs: 32,
    barClass: 'stylesheet',
  },
  {
    id: '5',
    name: 'api/data',
    status: '200',
    statusFailed: false,
    type: 'fetch',
    initiator: 'app.js:102',
    size: '1.2 kB',
    timeMs: 120,
    startMs: 200,
    durationMs: 120,
    barClass: 'fetch',
  },
];

@Component({
  selector: 'app-network-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './network-panel.component.html',
  styleUrl: './network-panel.component.scss',
})
export class NetworkPanelComponent {
  @Input() set requests(value: NetworkRequest[] | null) {
    this.requestsSignal.set(value ?? []);
  }
  @Output() rowSelected = new EventEmitter<NetworkRequest>();

  private readonly requestsSignal = signal<NetworkRequest[]>([]);
  private colResize:
    | { col: 'name' | 'status' | 'type' | 'initiator' | 'size' | 'time'; startX: number }
    | null = null;

  /** Colonnes redimensionnables : largeurs en px */
  readonly colWidths = signal({
    name: 280,
    status: 220,
    type: 72,
    initiator: 160,
    size: 88,
    time: 72,
  });

  readonly sortKey = signal<keyof NetworkRowView | 'name'>('startMs');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  readonly rows = computed(() => {
    const raw = this.requestsSignal();
    if (raw.length === 0) {
      return this.sortRows([...MOCK_ROWS]);
    }
    const sessionStart = Math.min(...raw.map((x) => x.timestamp));
    return this.sortRows(raw.map((r) => this.mapRequest(r, sessionStart)));
  });

  readonly timelineMaxMs = computed(() => {
    const rows = this.rows();
    let max = 12000;
    for (const r of rows) {
      const end = r.startMs + r.durationMs;
      if (end > max) max = Math.ceil(end / 1000) * 1000;
    }
    return Math.max(max, 1000);
  });

  /** Marqueurs d’axe (1 s, 2 s, …) comme les DevTools */
  readonly timeTicks = computed(() => {
    const max = this.timelineMaxMs();
    const step = max <= 20000 ? 1000 : 5000;
    const ticks: number[] = [];
    for (let t = step; t <= max; t += step) {
      ticks.push(t);
    }
    return { max, ticks, step };
  });

  /** Lignes verticales grille + DOM / Load (démo) */
  readonly domContentLoadedMs = 978;
  readonly loadEventMs = 1810;

  readonly footerStats = computed(() => {
    const rows = this.rows();
    const totalKb = rows.reduce((acc, r) => acc + this.parseSizeKb(r.size), 0);
    const transferred = rows.some((r) => r.statusFailed) ? 0 : totalKb;
    const finishMs = Math.max(...rows.map((r) => r.startMs + r.durationMs), 10180);
    return {
      shown: rows.length,
      total: 37,
      transferredKb: transferred.toFixed(1),
      resourcesKb: (2614).toLocaleString('fr-FR'),
      finishMs: (finishMs / 1000).toFixed(2),
    };
  });

  onRowClick(row: NetworkRowView): void {
    const req = this.requestsSignal().find((r) => r.id === row.id);
    if (req) {
      this.rowSelected.emit(req);
    }
  }

  sortBy(key: keyof NetworkRowView | 'name'): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  barLeftPct(row: NetworkRowView): number {
    const max = this.timelineMaxMs();
    return (row.startMs / max) * 100;
  }

  barWidthPct(row: NetworkRowView): number {
    const max = this.timelineMaxMs();
    return Math.max((row.durationMs / max) * 100, 0.35);
  }

  milestoneLeftPct(ms: number): number {
    return (ms / this.timelineMaxMs()) * 100;
  }

  onColResizeStart(
    ev: PointerEvent,
    col: 'name' | 'status' | 'type' | 'initiator' | 'size' | 'time',
  ): void {
    ev.preventDefault();
    this.colResize = { col, startX: ev.clientX };
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  onColResizeMove(ev: PointerEvent): void {
    if (!this.colResize) return;
    const delta = ev.clientX - this.colResize.startX;
    this.colResize.startX = ev.clientX;
    this.onResizeColumn(this.colResize.col, delta);
  }

  @HostListener('document:pointerup')
  onColResizeEnd(): void {
    this.colResize = null;
  }

  private onResizeColumn(
    col: 'name' | 'status' | 'type' | 'initiator' | 'size' | 'time',
    delta: number,
  ): void {
    this.colWidths.update((w) => ({
      ...w,
      [col]: Math.max(48, w[col] + delta),
    }));
  }

  loadEventSeconds(): string {
    return (this.loadEventMs / 1000).toFixed(2);
  }

  private mapRequest(r: NetworkRequest, sessionStart: number): NetworkRowView {
    const startMs = r.timestamp - sessionStart;
    const durationMs = r.duration ?? 80;
    const failed = r.status == null || r.status === 0;
    const name = this.shortUrl(r.url);
    const barClass = failed
      ? 'failed'
      : r.type === 'xhr'
        ? 'xhr'
        : 'fetch';
    return {
      id: r.id,
      name,
      status: failed ? '(failed) net::ERR_CONNECTION_REFUSED' : String(r.status),
      statusFailed: failed,
      type: r.type,
      initiator: '—',
      size: '—',
      timeMs: durationMs,
      startMs,
      durationMs,
      barClass,
    };
  }

  private shortUrl(url: string): string {
    try {
      const u = new URL(url);
      const base = u.pathname.split('/').pop() || u.host;
      return base.length > 48 ? base.slice(0, 20) + '…' + base.slice(-12) : base;
    } catch {
      return url.length > 48 ? url.slice(0, 36) + '…' : url;
    }
  }

  private parseSizeKb(s: string): number {
    const m = s.match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
  }

  private sortRows(rows: NetworkRowView[]): NetworkRowView[] {
    const key = this.sortKey();
    const dir = this.sortDir();
    return [...rows].sort((a, b) => {
      const va = a[key as keyof NetworkRowView];
      const vb = b[key as keyof NetworkRowView];
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb));
      }
      return dir === 'asc' ? cmp : -cmp;
    });
  }
}

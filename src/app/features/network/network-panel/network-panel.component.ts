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
import { DEFAULT_PAGE_TIMINGS } from '../../../data/default-network.data';
import type { NetworkRequest } from '../../../core/types';
import type { NetworkRowView } from '../models/network-row.model';
import { NetworkChartComponent } from '../network-chart/network-chart.component';

@Component({
  selector: 'app-network-panel',
  standalone: true,
  imports: [CommonModule, NetworkChartComponent],
  templateUrl: './network-panel.component.html',
  host: {
    class:
      'box-border flex min-h-0 min-w-0 w-full flex-1 flex-col self-stretch',
  },
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

  readonly domContentLoadedMs = DEFAULT_PAGE_TIMINGS.domContentLoadedMs;
  readonly loadEventMs = DEFAULT_PAGE_TIMINGS.loadEventMs;

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
      return [];
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
    const name = r.displayName ?? this.shortUrl(r.url);
    const barClass: NetworkRowView['barClass'] = failed
      ? 'failed'
      : r.type === 'xhr'
        ? 'xhr'
        : r.type === 'script'
          ? 'script'
          : r.type === 'stylesheet'
            ? 'stylesheet'
            : 'fetch';
    return {
      id: r.id,
      name,
      status: failed ? '(failed) net::ERR_CONNECTION_REFUSED' : String(r.status),
      statusFailed: failed,
      type: r.type,
      initiator: r.displayInitiator ?? '—',
      size: r.displaySize ?? '—',
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

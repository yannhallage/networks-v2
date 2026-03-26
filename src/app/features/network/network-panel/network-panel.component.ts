import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NetworkStore } from '../../../core/network.store';
import type { NetworkRequest } from '../../../core/types';
import type { NetworkRowView } from '../models/network-row.model';
import { NetworkChartComponent } from '../network-chart/network-chart.component';

type ThemePreference = 'light' | 'dark' | 'auto';

@Component({
  selector: 'app-network-panel',
  standalone: true,
  imports: [CommonModule, NetworkChartComponent],
  templateUrl: './network-panel.component.html',
  host: {
    class:
      'box-border flex min-h-0 min-w-0 w-full flex-1 flex-col self-stretch overflow-hidden',
  },
})
export class NetworkPanelComponent implements OnInit, OnDestroy {
  private readonly store = inject(NetworkStore);
  /** Même flux que WebSocket / import : le store est la source unique. */
  readonly requestsSignal = toSignal(this.store.requests$, {
    initialValue: [] as NetworkRequest[],
  });

  @Output() rowSelected = new EventEmitter<NetworkRequest>();
  @Output() compareRequested = new EventEmitter<[NetworkRequest, NetworkRequest]>();
  @Output() sessionImported = new EventEmitter<NetworkRequest[]>();
  @Output() panelCleared = new EventEmitter<void>();
  private readonly documentRef = inject(DOCUMENT);

  private colResize:
    | { col: 'name' | 'status' | 'type' | 'initiator' | 'size' | 'time'; startX: number }
    | null = null;

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
  readonly selectedCompareIds = signal<string[]>([]);
  readonly isClearing = signal(false);
  readonly themePreference = signal<ThemePreference>('auto');
  readonly resolvedTheme = computed<'light' | 'dark'>(() => {
    const pref = this.themePreference();
    if (pref === 'auto') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return pref;
  });

  private readonly systemPrefersDark = signal(false);
  private readonly storageKey = 'networkPanelThemePreference';
  private readonly slowThresholdMs = 1000;
  private readonly largeThresholdBytes = 512 * 1024;
  private mediaQuery: MediaQueryList | null = null;
  private mediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null;

  constructor() {
    effect(() => {
      const theme = this.resolvedTheme();
      const root = this.documentRef?.documentElement;
      if (!root) {
        return;
      }
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme;
    });
  }

  readonly rows = computed(() => {
    const raw = this.requestsSignal();
    if (raw.length === 0) {
      return [];
    }
    const sessionStart = Math.min(...raw.map((x) => x.timestamp));
    return this.sortRows(raw.map((r) => this.mapRequest(r, sessionStart)));
  });

  readonly footerStats = computed(() => {
    const raw = this.requestsSignal();
    const rows = this.rows();
    const totalKb = rows.reduce((acc, r) => acc + this.parseSizeKb(r.size), 0);
    const transferred = rows.some((r) => r.statusFailed) ? 0 : totalKb;
    const resourcesBytes = raw.reduce((acc, r) => acc + this.estimateSizeBytes(r), 0);
    const resourcesKb = (resourcesBytes / 1024).toLocaleString('fr-FR', {
      maximumFractionDigits: 1,
    });
    const finishMs =
      rows.length === 0
        ? 0
        : Math.max(...rows.map((r) => r.startMs + r.durationMs));
    return {
      shown: rows.length,
      total: rows.length,
      transferredKb: transferred.toFixed(1),
      resourcesKb,
      finishMs: (finishMs / 1000).toFixed(2),
      alerts: rows.reduce(
        (acc, row) => acc + (row.alertFlags.slow || row.alertFlags.error || row.alertFlags.large ? 1 : 0),
        0,
      ),
    };
  });

  readonly canCompare = computed(() => this.selectedCompareIds().length === 2);

  ngOnInit(): void {
    this.themePreference.set(this.readStoredThemePreference());
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPrefersDark.set(this.mediaQuery.matches);
    this.mediaQueryListener = (event: MediaQueryListEvent) => {
      this.systemPrefersDark.set(event.matches);
    };
    this.mediaQuery.addEventListener('change', this.mediaQueryListener);
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }

  onRowClick(row: NetworkRowView): void {
    const req = this.requestsSignal().find((r) => r.id === row.id);
    if (req) {
      this.rowSelected.emit(req);
    }
  }

  toggleCompareSelection(row: NetworkRowView): void {
    this.selectedCompareIds.update((ids) => {
      if (ids.includes(row.id)) {
        return ids.filter((x) => x !== row.id);
      }
      if (ids.length >= 2) {
        return [ids[1], row.id];
      }
      return [...ids, row.id];
    });
  }

  isSelectedForCompare(row: NetworkRowView): boolean {
    return this.selectedCompareIds().includes(row.id);
  }

  emitCompareSelection(): void {
    const ids = this.selectedCompareIds();
    if (ids.length !== 2) {
      return;
    }
    const a = this.requestsSignal().find((r) => r.id === ids[0]);
    const b = this.requestsSignal().find((r) => r.id === ids[1]);
    if (a && b) {
      this.compareRequested.emit([a, b]);
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

  setThemePreference(value: ThemePreference): void {
    this.themePreference.set(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, value);
    }
  }

  clearPanel(): void {
    this.store.setRequests([]);
    this.selectedCompareIds.set([]);
    this.panelCleared.emit();
  }

  clearPanelWithLoader(): void {
    if (this.isClearing() || this.requestsSignal().length === 0) {
      return;
    }
    this.isClearing.set(true);
    window.setTimeout(() => {
      this.clearPanel();
      this.isClearing.set(false);
    }, 900);
  }

  exportSession(): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      return;
    }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      requests: this.requestsSignal(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `network-session-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async onImportSessionFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const imported = this.parseImportedFile(parsed);
      if (imported.length > 0) {
        this.sessionImported.emit(imported);
      }
    } catch {
      // Ignore malformed files to keep UI simple.
    } finally {
      if (input) input.value = '';
    }
  }

  isThemePreference(value: ThemePreference): boolean {
    return this.themePreference() === value;
  }

  private mapRequest(r: NetworkRequest, sessionStart: number): NetworkRowView {
    const startMs = r.timestamp - sessionStart;
    const durationMs = r.duration ?? 80;
    const failed = r.status == null || r.status === 0;
    const name = r.displayName ?? this.shortUrl(r.url);
    const sizeBytes = this.estimateSizeBytes(r);
    const timelineSegments = this.buildTimelineSegments(r, durationMs);
    const alertFlags = {
      slow: durationMs > this.slowThresholdMs,
      error: failed || (r.status ?? 0) >= 400,
      large: sizeBytes > this.largeThresholdBytes,
    };
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
      capturedAtMs: r.timestamp,
      durationMs,
      barClass,
      timelineSegments,
      alertFlags,
    };
  }

  timelineSegmentStyle(
    segment: { key: string; ms: number; className: string },
    row: NetworkRowView,
  ): Record<string, string> {
    const width = Math.max(2, (segment.ms / Math.max(1, row.durationMs)) * 100);
    return { width: `${width}%` };
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

  private estimateSizeBytes(request: NetworkRequest): number {
    if (typeof request.transferSizeBytes === 'number' && Number.isFinite(request.transferSizeBytes)) {
      return Math.max(0, request.transferSizeBytes);
    }
    if (request.displaySize) {
      const n = this.parseSizeKb(request.displaySize);
      if (Number.isFinite(n) && n > 0) {
        return Math.round(n * 1024);
      }
    }
    return 0;
  }

  private buildTimelineSegments(
    request: NetworkRequest,
    fallbackDurationMs: number,
  ): { key: string; ms: number; className: string }[] {
    const t = request.timings;
    const segments: { key: string; ms: number; className: string }[] = [];
    const add = (key: string, ms: number | undefined, className: string): void => {
      if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) {
        segments.push({ key, ms, className });
      }
    };
    add('blocked', t?.blockedMs, 'bg-slate-300');
    add('dns', t?.dnsMs, 'bg-purple-400');
    add('connect', t?.connectMs, 'bg-blue-400');
    add('ssl', t?.sslMs, 'bg-indigo-500');
    add('ttfb', t?.ttfbMs, 'bg-amber-400');
    add('download', t?.downloadMs, 'bg-emerald-500');
    if (segments.length > 0) {
      return segments;
    }
    return [{ key: 'total', ms: Math.max(1, fallbackDurationMs), className: 'bg-teal-500' }];
  }

  private parseImportedFile(parsed: unknown): NetworkRequest[] {
    if (this.isObject(parsed) && Array.isArray((parsed as { requests?: unknown }).requests)) {
      return ((parsed as { requests: unknown[] }).requests.map((x) => this.normalizeRequest(x)).filter(Boolean) as
        NetworkRequest[]);
    }

    // HAR (best effort)
    const entries = this.tryHarEntries(parsed);
    if (entries) {
      return entries.map((entry, i) => this.mapHarEntry(entry, i)).filter(Boolean) as NetworkRequest[];
    }
    return [];
  }

  private tryHarEntries(parsed: unknown): unknown[] | null {
    if (!this.isObject(parsed)) return null;
    const log = (parsed as { log?: unknown }).log;
    if (!this.isObject(log)) return null;
    const entries = (log as { entries?: unknown }).entries;
    return Array.isArray(entries) ? entries : null;
  }

  private mapHarEntry(entry: unknown, index: number): NetworkRequest | null {
    if (!this.isObject(entry)) return null;
    const req = this.isObject((entry as { request?: unknown }).request)
      ? ((entry as { request: Record<string, unknown> }).request as Record<string, unknown>)
      : null;
    const res = this.isObject((entry as { response?: unknown }).response)
      ? ((entry as { response: Record<string, unknown> }).response as Record<string, unknown>)
      : null;
    const startedDateTime = typeof (entry as { startedDateTime?: unknown }).startedDateTime === 'string'
      ? (entry as { startedDateTime: string }).startedDateTime
      : null;
    const timestamp = startedDateTime ? Date.parse(startedDateTime) : Date.now() + index;
    const time = Number((entry as { time?: unknown }).time);
    const timings = this.isObject((entry as { timings?: unknown }).timings)
      ? ((entry as { timings: Record<string, unknown> }).timings as Record<string, unknown>)
      : {};

    const requestHeaders = this.harHeadersToRecord(req?.['headers']);
    const responseHeaders = this.harHeadersToRecord(res?.['headers']);
    const bodyText = this.harResponseText(res?.['content']);
    return {
      id: `har-${index}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'fetch',
      url: typeof req?.['url'] === 'string' ? req['url'] : '',
      method: typeof req?.['method'] === 'string' ? req['method'] : 'GET',
      status: typeof res?.['status'] === 'number' ? res['status'] : undefined,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now() + index,
      duration: Number.isFinite(time) ? Math.max(0, time) : undefined,
      requestHeaders,
      responseHeaders,
      responseBody: bodyText,
      transferSizeBytes: typeof res?.['_transferSize'] === 'number' ? (res['_transferSize'] as number) : undefined,
      resourceSizeBytes: typeof (res?.['content'] as { size?: unknown } | undefined)?.size === 'number'
        ? ((res?.['content'] as { size: number }).size)
        : undefined,
      timings: {
        blockedMs: this.harTiming(timings['blocked']),
        dnsMs: this.harTiming(timings['dns']),
        connectMs: this.harTiming(timings['connect']),
        sslMs: this.harTiming(timings['ssl']),
        ttfbMs: this.harTiming(timings['wait']),
        downloadMs: this.harTiming(timings['receive']),
      },
    };
  }

  private harResponseText(content: unknown): unknown {
    if (!this.isObject(content)) return undefined;
    const text = (content as { text?: unknown }).text;
    if (typeof text !== 'string') return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private harHeadersToRecord(raw: unknown): Record<string, string> {
    if (!Array.isArray(raw)) return {};
    const out: Record<string, string> = {};
    for (const item of raw) {
      if (!this.isObject(item)) continue;
      const name = (item as { name?: unknown }).name;
      const value = (item as { value?: unknown }).value;
      if (typeof name === 'string' && typeof value === 'string') {
        out[name] = value;
      }
    }
    return out;
  }

  private harTiming(value: unknown): number | undefined {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }

  private normalizeRequest(value: unknown): NetworkRequest | null {
    if (!this.isObject(value)) return null;
    const id = typeof value['id'] === 'string' ? value['id'] : `imported-${Date.now()}-${Math.random()}`;
    const url = typeof value['url'] === 'string' ? value['url'] : '';
    if (!url) return null;
    const method = typeof value['method'] === 'string' ? value['method'] : 'GET';
    const type = value['type'];
    const safeType = type === 'fetch' || type === 'xhr' || type === 'script' || type === 'stylesheet' ? type : 'fetch';
    const timestamp = Number(value['timestamp']);
    const status = typeof value['status'] === 'number' ? value['status'] : undefined;
    const duration = typeof value['duration'] === 'number' ? value['duration'] : undefined;
    const requestHeaders = this.toStringRecord(value['requestHeaders']);
    const responseHeaders = this.toStringRecord(value['responseHeaders']);
    return {
      id,
      url,
      method,
      type: safeType,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      status,
      duration,
      requestHeaders,
      requestBody: value['requestBody'],
      responseHeaders,
      responseBody: value['responseBody'],
      displayName: typeof value['displayName'] === 'string' ? value['displayName'] : undefined,
      displaySize: typeof value['displaySize'] === 'string' ? value['displaySize'] : undefined,
      displayInitiator: typeof value['displayInitiator'] === 'string' ? value['displayInitiator'] : undefined,
      transferSizeBytes:
        typeof value['transferSizeBytes'] === 'number' ? value['transferSizeBytes'] : undefined,
      resourceSizeBytes:
        typeof value['resourceSizeBytes'] === 'number' ? value['resourceSizeBytes'] : undefined,
      mimeType: typeof value['mimeType'] === 'string' ? value['mimeType'] : undefined,
      errorText: typeof value['errorText'] === 'string' ? value['errorText'] : undefined,
      timings: this.toTimings(value['timings']),
    };
  }

  private toTimings(value: unknown): NetworkRequest['timings'] {
    if (!this.isObject(value)) return undefined;
    const read = (k: string): number | undefined => {
      const n = value[k];
      return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    return {
      blockedMs: read('blockedMs'),
      dnsMs: read('dnsMs'),
      connectMs: read('connectMs'),
      sslMs: read('sslMs'),
      ttfbMs: read('ttfbMs'),
      downloadMs: read('downloadMs'),
    };
  }

  private toStringRecord(value: unknown): Record<string, string> | undefined {
    if (!this.isObject(value)) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string') {
        out[k] = v;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
  }

  private readStoredThemePreference(): ThemePreference {
    if (typeof localStorage === 'undefined') {
      return 'auto';
    }
    const stored = localStorage.getItem(this.storageKey);
    return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
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

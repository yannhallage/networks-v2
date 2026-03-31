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
import { ApiTesterAuthorizationItemComponent } from './items/api-tester-authorization-item/api-tester-authorization-item.component';
import { ApiTesterBodyItemComponent } from './items/api-tester-body-item/api-tester-body-item.component';
import { ApiTesterDocsItemComponent } from './items/api-tester-docs-item/api-tester-docs-item.component';
import { ApiTesterHeadersItemComponent } from './items/api-tester-headers-item/api-tester-headers-item.component';
import { ApiTesterParamsItemComponent } from './items/api-tester-params-item/api-tester-params-item.component';
import { ApiTesterScriptsItemComponent } from './items/api-tester-scripts-item/api-tester-scripts-item.component';
import { ApiTesterSettingsItemComponent } from './items/api-tester-settings-item/api-tester-settings-item.component';

type ApiTesterMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

/** Couleurs type Postman / client HTTP (réf. UI). */
const METHOD_LABEL_COLORS: Record<ApiTesterMethod, string> = {
  GET: '#2E7D32',
  POST: '#B8860B',
  PUT: '#1976D2',
  PATCH: '#673AB7',
  DELETE: '#A52A2A',
  HEAD: '#2E7D32',
  OPTIONS: '#C2185B',
};

/** Variantes un peu plus claires pour lisibilité sur fond sombre. */
const METHOD_LABEL_COLORS_DARK: Record<ApiTesterMethod, string> = {
  GET: '#66BB6A',
  POST: '#D4AF37',
  PUT: '#42A5F5',
  PATCH: '#B39DDB',
  DELETE: '#EF5350',
  HEAD: '#66BB6A',
  OPTIONS: '#F06292',
};
type ApiTesterTab = 'docs' | 'params' | 'authorization' | 'headers' | 'body' | 'scripts' | 'settings';
type ApiTesterResponseTab = 'body' | 'cookies' | 'headers' | 'tests';
type ApiTesterRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
};
type ApiTesterAuthorizationSnapshot = {
  type: 'none' | 'bearer' | 'basic' | 'apiKey';
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyLocation: 'header' | 'query';
};
type ApiTesterBodySnapshot = {
  mode: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';
  rawFormat: 'text' | 'javascript' | 'json' | 'html' | 'xml';
  raw: string;
  graphqlQuery: string;
  graphqlVariables: string;
  formData: ApiTesterRow[];
  urlEncoded: ApiTesterRow[];
  binary: File | null;
};

@Component({
  selector: 'app-api-tester-modal',
  standalone: true,
  imports: [
    CommonModule,
    ApiTesterDocsItemComponent,
    ApiTesterParamsItemComponent,
    ApiTesterAuthorizationItemComponent,
    ApiTesterHeadersItemComponent,
    ApiTesterBodyItemComponent,
    ApiTesterScriptsItemComponent,
    ApiTesterSettingsItemComponent,
  ],
  templateUrl: './api-tester-modal.component.html',
  styles: [`
    .api-loader {
      align-items: flex-end;
      display: flex;
      gap: 4px;
      height: 14px;
    }

    .api-loader__bar {
      animation: api-loader-wave 0.9s ease-in-out infinite;
      background: #3b82f6;
      border-radius: 2px;
      height: 100%;
      transform-origin: bottom center;
      width: 3px;
    }

    .api-loader__bar:nth-child(1) { animation-delay: 0ms; }
    .api-loader__bar:nth-child(2) { animation-delay: 120ms; }
    .api-loader__bar:nth-child(3) { animation-delay: 240ms; }
    .api-loader__bar:nth-child(4) { animation-delay: 360ms; }
    .api-loader__bar:nth-child(5) { animation-delay: 480ms; }

    @keyframes api-loader-wave {
      0%, 100% {
        opacity: 0.4;
        transform: scaleY(0.35);
      }
      50% {
        opacity: 1;
        transform: scaleY(1);
      }
    }
  `],
})
export class ApiTesterModalComponent {
  @Input({ required: true }) open = false;
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';
  @Output() closed = new EventEmitter<void>();

  /** Hauteur du panneau Response (px), redimensionnable par la poignée entre les deux zones. */
  readonly responsePanelHeightPx = signal(280);
  private responseResize: { startY: number; startH: number } | null = null;

  readonly method = signal<ApiTesterMethod>('GET');
  readonly activeTab = signal<ApiTesterTab>('docs');
  readonly requestUrl = signal('');
  readonly isSending = signal(false);
  readonly responseSummary = signal('');
  readonly responseText = signal('');
  readonly responseIsError = signal(false);
  readonly responseStatusCode = signal<number | null>(null);
  readonly responseStatusText = signal('');
  readonly responseElapsedMs = signal<number | null>(null);
  readonly responseSizeBytes = signal<number | null>(null);
  readonly responseHeadersText = signal('');
  readonly responseHeadersCount = signal(0);
  readonly responseCookiesCount = signal(0);
  readonly responseViewTab = signal<ApiTesterResponseTab>('body');

  private queryParams: ApiTesterRow[] = [];
  private headersRows: ApiTesterRow[] = [];
  private auth: ApiTesterAuthorizationSnapshot = {
    type: 'none',
    bearerToken: '',
    basicUsername: '',
    basicPassword: '',
    apiKeyName: '',
    apiKeyValue: '',
    apiKeyLocation: 'header',
  };
  private body: ApiTesterBodySnapshot = {
    mode: 'raw',
    rawFormat: 'json',
    raw: '',
    graphqlQuery: '',
    graphqlVariables: '{}',
    formData: [],
    urlEncoded: [],
    binary: null,
  };

  readonly methods: ApiTesterMethod[] = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
  ];
  readonly tabs: { id: ApiTesterTab; label: string }[] = [
    { id: 'docs', label: 'Docs' },
    { id: 'params', label: 'Params' },
    { id: 'authorization', label: 'Authorization' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'scripts', label: 'Scripts' },
    { id: 'settings', label: 'Settings' },
  ];
  readonly canSend = computed(() => this.requestUrl().trim().length > 0 && !this.isSending());
  readonly responseSizeLabel = computed(() => {
    const size = this.responseSizeBytes();
    if (size === null) return '--';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  });
  readonly responseBodyLines = computed(() => this.buildHighlightedLines(this.responseText()));

  close(): void {
    this.closed.emit();
  }

  setTab(tab: ApiTesterTab): void {
    this.activeTab.set(tab);
  }

  setMethod(value: string): void {
    if (Object.hasOwn(METHOD_LABEL_COLORS, value)) {
      this.method.set(value as ApiTesterMethod);
    }
  }

  setRequestUrl(value: string): void {
    this.requestUrl.set(value);
  }

  onParamsChanged(rows: ApiTesterRow[]): void {
    this.queryParams = rows;
  }

  onHeadersChanged(rows: ApiTesterRow[]): void {
    this.headersRows = rows;
  }

  onAuthChanged(auth: ApiTesterAuthorizationSnapshot): void {
    this.auth = auth;
  }

  onBodyChanged(body: ApiTesterBodySnapshot): void {
    this.body = body;
  }

  setResponseViewTab(tab: ApiTesterResponseTab): void {
    this.responseViewTab.set(tab);
  }

  clearResponse(): void {
    this.responseIsError.set(false);
    this.responseStatusCode.set(null);
    this.responseStatusText.set('');
    this.responseElapsedMs.set(null);
    this.responseSizeBytes.set(null);
    this.responseHeadersText.set('');
    this.responseHeadersCount.set(0);
    this.responseCookiesCount.set(0);
    this.responseSummary.set('');
    this.responseText.set('');
    this.responseViewTab.set('body');
  }

  async sendRequest(): Promise<void> {
    const rawUrl = this.requestUrl().trim();
    if (!rawUrl || this.isSending()) return;
    this.isSending.set(true);
    this.responseIsError.set(false);
    this.responseStatusCode.set(null);
    this.responseStatusText.set('');
    this.responseElapsedMs.set(null);
    this.responseSizeBytes.set(null);
    this.responseHeadersText.set('');
    this.responseHeadersCount.set(0);
    this.responseCookiesCount.set(0);
    this.responseSummary.set('Envoi en cours...');
    this.responseText.set('');
    try {
      const url = this.buildUrl(rawUrl);
      const headers = this.buildHeaders();
      const body = this.buildRequestBody(headers);
      const startedAt = performance.now();
      const response = await fetch(url.toString(), {
        method: this.method(),
        headers,
        body,
      });
      const elapsed = Math.round(performance.now() - startedAt);
      const contentType = response.headers.get('content-type') ?? '';
      const text = await response.text();
      const sizeBytes = new TextEncoder().encode(text).length;
      const formatted = this.formatResponseBody(text, contentType);
      const headersText = this.formatResponseHeaders(response.headers);
      const headersCount = this.countHeaders(response.headers);
      const cookiesCount = this.countCookies(response.headers);
      this.responseStatusCode.set(response.status);
      this.responseStatusText.set(response.statusText || 'OK');
      this.responseElapsedMs.set(elapsed);
      this.responseSizeBytes.set(sizeBytes);
      this.responseHeadersText.set(headersText);
      this.responseHeadersCount.set(headersCount);
      this.responseCookiesCount.set(cookiesCount);
      this.responseSummary.set(`${response.status} ${response.statusText || ''} - ${elapsed} ms`);
      this.responseIsError.set(!response.ok);
      this.responseText.set(formatted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      this.responseStatusCode.set(null);
      this.responseStatusText.set('');
      this.responseElapsedMs.set(null);
      this.responseSizeBytes.set(null);
      this.responseHeadersText.set('');
      this.responseHeadersCount.set(0);
      this.responseCookiesCount.set(0);
      this.responseSummary.set('Echec de la requete');
      this.responseIsError.set(true);
      this.responseText.set(message);
    } finally {
      this.isSending.set(false);
    }
  }

  /** Couleur du libellé pour la méthode affichée (clair / sombre). */
  methodLabelColor(m: ApiTesterMethod): string {
    if (this.theme === 'dark') {
      return METHOD_LABEL_COLORS_DARK[m];
    }
    return METHOD_LABEL_COLORS[m];
  }

  onResponseResizeStart(ev: PointerEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.responseResize = {
      startY: ev.clientY,
      startH: this.responsePanelHeightPx(),
    };
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  onResponseResizeMove(ev: PointerEvent): void {
    if (!this.responseResize) return;
    const h =
      this.responseResize.startH +
      (this.responseResize.startY - ev.clientY);
    this.responsePanelHeightPx.set(this.clampResponseHeight(h));
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  onResponseResizeEnd(): void {
    this.responseResize = null;
  }

  onResponseResizeKeydown(ev: KeyboardEvent): void {
    if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
    ev.preventDefault();
    const step = ev.shiftKey ? 24 : 8;
    const delta = ev.key === 'ArrowUp' ? step : -step;
    this.responsePanelHeightPx.update((h) => this.clampResponseHeight(h + delta));
  }

  private clampResponseHeight(h: number): number {
    const min = 120;
    const max = 640;
    return Math.max(min, Math.min(max, Math.round(h)));
  }

  private buildUrl(rawUrl: string): URL {
    const url = new URL(rawUrl);
    for (const p of this.queryParams) {
      if (!p.enabled) continue;
      const key = p.key.trim();
      if (!key) continue;
      url.searchParams.set(key, p.value ?? '');
    }
    if (this.auth.type === 'apiKey' && this.auth.apiKeyLocation === 'query') {
      const key = this.auth.apiKeyName.trim();
      if (key) {
        url.searchParams.set(key, this.auth.apiKeyValue);
      }
    }
    return url;
  }

  private buildHeaders(): Headers {
    const headers = new Headers();
    for (const h of this.headersRows) {
      if (!h.enabled) continue;
      const key = h.key.trim();
      if (!key) continue;
      headers.set(key, h.value ?? '');
    }
    if (this.auth.type === 'bearer' && this.auth.bearerToken.trim()) {
      headers.set('Authorization', `Bearer ${this.auth.bearerToken.trim()}`);
    } else if (this.auth.type === 'basic' && this.auth.basicUsername.trim()) {
      const creds = btoa(`${this.auth.basicUsername}:${this.auth.basicPassword}`);
      headers.set('Authorization', `Basic ${creds}`);
    } else if (this.auth.type === 'apiKey' && this.auth.apiKeyLocation === 'header') {
      const key = this.auth.apiKeyName.trim();
      if (key) {
        headers.set(key, this.auth.apiKeyValue);
      }
    }
    return headers;
  }

  private buildRequestBody(headers: Headers): BodyInit | undefined {
    const method = this.method();
    if (method === 'GET' || method === 'HEAD') return undefined;
    if (this.body.mode === 'none') return undefined;
    if (this.body.mode === 'binary') return this.body.binary ?? undefined;
    if (this.body.mode === 'form-data') {
      const form = new FormData();
      for (const row of this.body.formData) {
        if (!row.enabled || !row.key.trim()) continue;
        form.append(row.key.trim(), row.value ?? '');
      }
      return form;
    }
    if (this.body.mode === 'x-www-form-urlencoded') {
      const params = new URLSearchParams();
      for (const row of this.body.urlEncoded) {
        if (!row.enabled || !row.key.trim()) continue;
        params.append(row.key.trim(), row.value ?? '');
      }
      headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
      return params.toString();
    }
    if (this.body.mode === 'graphql') {
      headers.set('Content-Type', 'application/json');
      let variables: unknown = {};
      const vars = this.body.graphqlVariables.trim();
      if (vars) {
        variables = JSON.parse(vars);
      }
      return JSON.stringify({
        query: this.body.graphqlQuery,
        variables,
      });
    }
    if (this.body.mode === 'raw') {
      if (this.body.rawFormat === 'json') {
        headers.set('Content-Type', 'application/json');
        const parsed = JSON.parse(this.body.raw || '{}');
        return JSON.stringify(parsed);
      }
      if (this.body.rawFormat === 'xml') {
        headers.set('Content-Type', 'application/xml');
      } else if (this.body.rawFormat === 'html') {
        headers.set('Content-Type', 'text/html');
      } else if (this.body.rawFormat === 'javascript') {
        headers.set('Content-Type', 'application/javascript');
      } else {
        headers.set('Content-Type', 'text/plain');
      }
      return this.body.raw;
    }
    return undefined;
  }

  private formatResponseBody(text: string, contentType: string): string {
    if (!text) return '(empty body)';
    if (contentType.includes('application/json')) {
      try {
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        return text;
      }
    }
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }

  private formatResponseHeaders(headers: Headers): string {
    const lines: string[] = [];
    headers.forEach((value, key) => lines.push(`${key}: ${value}`));
    if (lines.length === 0) return '(no response headers)';
    return lines.join('\n');
  }

  private countHeaders(headers: Headers): number {
    let count = 0;
    headers.forEach(() => {
      count += 1;
    });
    return count;
  }

  private countCookies(headers: Headers): number {
    const raw = headers.get('set-cookie');
    if (!raw) return 0;
    return raw.split(',').filter((v) => v.trim().length > 0).length;
  }

  private buildHighlightedLines(text: string): string[] {
    const safe = this.escapeHtml(text || '');
    const lines = (safe || '(empty body)').split('\n');
    const jsonLike = this.looksLikeJson(text);
    if (!jsonLike) return lines;
    return lines.map((line) => this.highlightJsonLine(line));
  }

  private looksLikeJson(text: string): boolean {
    const t = text.trim();
    return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
  }

  private highlightJsonLine(line: string): string {
    let out = line;
    // Highlight numbers first on raw escaped text to avoid matching
    // digits inside injected HTML class names (e.g. "-700").
    out = out.replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="text-amber-700">$1</span>');
    out = out.replace(/(&quot;.*?&quot;)\s*:/g, '<span class="text-blue-700">$1</span>:');
    out = out.replace(/:\s*(&quot;.*?&quot;)/g, ': <span class="text-emerald-700">$1</span>');
    out = out.replace(/\b(true|false)\b/g, '<span class="text-purple-700">$1</span>');
    out = out.replace(/\bnull\b/g, '<span class="text-rose-700">$1</span>');
    return out;
  }

  private escapeHtml(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}

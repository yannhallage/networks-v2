import { Component, effect, input, output, signal } from '@angular/core';
import type { NetworkRequest } from '../../../core/types';
import { DetailCompareComponent } from './detail-compare/detail-compare.component';
import { DetailHeadersComponent } from './detail-headers/detail-headers.component';
import { DetailPreviewComponent } from './detail-preview/detail-preview.component';
import { DetailResponseComponent } from './detail-response/detail-response.component';

export type RequestDetailTab = 'headers' | 'preview' | 'response' | 'compare';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [DetailHeadersComponent, DetailPreviewComponent, DetailResponseComponent, DetailCompareComponent],
  templateUrl: './request-detail.component.html',
  styles: [
    `
      .detail-tab {
        margin-bottom: -1px;
        border-bottom: 3px solid transparent;
        padding: 0.4rem 0.65rem 0.35rem;
        font-size: 11px;
        font-weight: 400;
        color: #5f6368;
        background: transparent;
        border-top: 0;
        border-left: 0;
        border-right: 0;
        cursor: pointer;
        font-family: inherit;
      }
      .detail-tab:hover {
        color: #202124;
      }
      .detail-tab-active {
        color: #1a73e8;
        font-weight: 500;
        border-bottom-color: #1a73e8;
      }
    `,
  ],
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class RequestDetailComponent {
  readonly request = input<NetworkRequest | null>(null);
  readonly comparison = input<[NetworkRequest, NetworkRequest] | null>(null);
  readonly closePanel = output<void>();
  readonly replayCaptured = output<NetworkRequest>();

  readonly activeTab = signal<RequestDetailTab>('headers');

  readonly tabs: { id: RequestDetailTab; label: string }[] = [
    { id: 'headers', label: 'Headers' },
    { id: 'preview', label: 'Preview' },
    { id: 'response', label: 'Response' },
    { id: 'compare', label: 'Compare' },
  ];

  constructor() {
    effect(() => {
      if (this.request()) {
        this.activeTab.set('headers');
      }
    });
  }

  selectTab(tab: RequestDetailTab): void {
    this.activeTab.set(tab);
  }

  onClose(): void {
    this.closePanel.emit();
  }

  async copyUrl(): Promise<void> {
    const url = this.request()?.url;
    if (!url || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(url);
  }

  async copyCurl(): Promise<void> {
    const req = this.request();
    if (!req || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const curl = this.toCurl(req);
    await navigator.clipboard.writeText(curl);
  }

  openInNewTab(): void {
    const url = this.request()?.url;
    if (!url || typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener');
  }

  async replayRequest(): Promise<void> {
    const req = this.request();
    if (!req) return;
    const startedAt = Date.now();
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.requestHeaders,
        body: this.requestBodyToText(req.requestBody),
      });
      const text = await response.text();
      const responseBody = this.tryParseJson(text);
      const responseHeaders = Object.fromEntries(response.headers.entries());
      this.replayCaptured.emit({
        ...req,
        id: `replay-${Date.now()}`,
        timestamp: startedAt,
        status: response.status,
        duration: Date.now() - startedAt,
        responseHeaders,
        responseBody,
      });
    } catch (err) {
      this.replayCaptured.emit({
        ...req,
        id: `replay-${Date.now()}`,
        timestamp: startedAt,
        status: 0,
        duration: Date.now() - startedAt,
        errorText: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private requestBodyToText(body: unknown): string | undefined {
    if (body == null) return undefined;
    if (typeof body === 'string') return body;
    try {
      return JSON.stringify(body);
    } catch {
      return String(body);
    }
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private toCurl(req: NetworkRequest): string {
    const parts = [`curl -X ${this.escapeShell(req.method)} ${this.escapeShell(req.url)}`];
    const headers = req.requestHeaders ?? {};
    for (const [k, v] of Object.entries(headers)) {
      parts.push(`-H ${this.escapeShell(`${k}: ${v}`)}`);
    }
    const body = this.requestBodyToText(req.requestBody);
    if (body) {
      parts.push(`--data-raw ${this.escapeShell(body)}`);
    }
    return parts.join(' ');
  }

  private escapeShell(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }
}

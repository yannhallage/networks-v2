import { Component, effect, input, output, signal } from '@angular/core';
import type { NetworkRequest } from '../../../core/types';
import { DetailCompareComponent } from './detail-compare/detail-compare.component';
import { DetailHeadersComponent } from './detail-headers/detail-headers.component';
import { DetailPreviewComponent } from './detail-preview/detail-preview.component';
import { DetailResponseComponent } from './detail-response/detail-response.component';

export type RequestDetailTab = 'headers' | 'preview' | 'response' | 'compare';
type DetailAction = 'copy-response-json' | 'copy-url' | 'copy-curl' | 'replay' | 'open' | null;

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
      .detail-action-btn {
        display: inline-flex;
        width: 1.25rem;
        height: 1.25rem;
        align-items: center;
        justify-content: center;
        border-radius: 0.25rem;
        border: 1px solid #d4d4d4;
        color: #404040;
        background: #fff;
        cursor: pointer;
      }
      .detail-action-btn:hover {
        background: #fafafa;
      }
      .detail-action-btn-active {
        border-color: #1a73e8;
        color: #1a73e8;
        background: #e8f0fe;
      }
      .rd-toast {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        pointer-events: none;
        border-radius: 0.5rem;
        border-width: 1px;
        padding: 0.55rem 0.8rem;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.01em;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
        animation: rd-toast-in-out 1.6s ease forwards;
      }
      .rd-toast-success {
        border-color: #aecbfa;
        background: #e8f0fe;
        color: #174ea6;
      }
      .rd-toast-error {
        border-color: #f1b7b3;
        background: #fce8e6;
        color: #a50e0e;
      }
      @keyframes rd-toast-in-out {
        0% {
          opacity: 0;
          transform: translate(-50%, calc(-50% + 14px)) scale(0.98);
        }
        14% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        80% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, calc(-50% - 16px)) scale(0.98);
        }
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
  readonly activeAction = signal<DetailAction>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly toastKind = signal<'success' | 'error'>('success');

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

  async copyResponseJson(): Promise<void> {
    const responseBody = this.request()?.responseBody;
    if (responseBody == null || typeof navigator === 'undefined' || !navigator.clipboard) {
      this.showToast('Aucune reponse JSON a copier.', 'error');
      return;
    }
    try {
      const payload = this.toClipboardText(responseBody);
      await navigator.clipboard.writeText(payload);
      this.pulseAction('copy-response-json');
      this.showToast('JSON de reponse copie.');
    } catch {
      this.showToast('Echec de copie du JSON.', 'error');
    }
  }

  async copyUrl(): Promise<void> {
    const url = this.request()?.url;
    if (!url || typeof navigator === 'undefined' || !navigator.clipboard) {
      this.showToast("Impossible de copier l'URL.", 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.pulseAction('copy-url');
      this.showToast('URL copiee.');
    } catch {
      this.showToast("Echec de copie de l'URL.", 'error');
    }
  }

  async copyCurl(): Promise<void> {
    const req = this.request();
    if (!req || typeof navigator === 'undefined' || !navigator.clipboard) {
      this.showToast('Impossible de copier cURL.', 'error');
      return;
    }
    try {
      const curl = this.toCurl(req);
      await navigator.clipboard.writeText(curl);
      this.pulseAction('copy-curl');
      this.showToast('Commande cURL copiee.');
    } catch {
      this.showToast('Echec de copie cURL.', 'error');
    }
  }

  openInNewTab(): void {
    const url = this.request()?.url;
    if (!url || typeof window === 'undefined') {
      this.showToast("Impossible d'ouvrir l'URL.", 'error');
      return;
    }
    window.open(url, '_blank', 'noopener');
    this.pulseAction('open');
    this.showToast('URL ouverte dans un nouvel onglet.');
  }

  async replayRequest(): Promise<void> {
    const req = this.request();
    if (!req) {
      this.showToast('Aucune requete a rejouer.', 'error');
      return;
    }
    this.pulseAction('replay');
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
      this.showToast('Requete rejouee avec succes.');
    } catch (err) {
      this.replayCaptured.emit({
        ...req,
        id: `replay-${Date.now()}`,
        timestamp: startedAt,
        status: 0,
        duration: Date.now() - startedAt,
        errorText: err instanceof Error ? err.message : String(err),
      });
      this.showToast('Echec du rejeu de la requete.', 'error');
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

  private toClipboardText(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
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

  private pulseAction(action: Exclude<DetailAction, null>): void {
    this.activeAction.set(action);
    setTimeout(() => {
      if (this.activeAction() === action) {
        this.activeAction.set(null);
      }
    }, 900);
  }

  private showToast(message: string, kind: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(message);
    this.toastKind.set(kind);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 1600);
  }
}

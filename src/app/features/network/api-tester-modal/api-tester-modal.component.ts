import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
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
}

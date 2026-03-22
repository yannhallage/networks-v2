import { AsyncPipe } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Subject, filter, takeUntil } from 'rxjs';
import { NetworkPanelComponent } from './features/network/network-panel/network-panel.component';
import { RequestDetailComponent } from './features/network/request-detail/request-detail.component';
import { NetworkStore } from './core/network.store';
import type { NetworkRequest } from './core/types';
import { WebSocketService } from './core/websocket.service';

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, NetworkPanelComponent, RequestDetailComponent],
  templateUrl: './app.component.html',
  host: {
    class:
      'flex min-h-0 max-w-full flex-1 flex-col overflow-hidden box-border w-full',
  },
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly ws = inject(WebSocketService);
  readonly store = inject(NetworkStore);
  private readonly destroy$ = new Subject<void>();

  readonly requests$ = this.store.requests$;
  selected: NetworkRequest | null = null;

  /** Largeur du panneau détails (px), redimensionnable par glisser la poignée. */
  readonly detailPanelWidth = signal(320);
  private detailResize: { startX: number; startW: number } | null = null;

  ngOnInit(): void {
    this.ws.connect();
    this.ws.messages$
      .pipe(
        filter(
          (m): m is { type: 'network_request'; payload: NetworkRequest } =>
            m.type === 'network_request' && m.payload != null,
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((m) => this.store.addRequest(m.payload));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.ws.disconnect();
  }

  onSelect(req: NetworkRequest): void {
    this.selected = req;
  }

  onDetailResizeStart(ev: PointerEvent): void {
    ev.preventDefault();
    this.detailResize = {
      startX: ev.clientX,
      startW: this.detailPanelWidth(),
    };
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  onDetailResizeMove(ev: PointerEvent): void {
    if (!this.detailResize) return;
    const w =
      this.detailResize.startW + (ev.clientX - this.detailResize.startX);
    this.detailPanelWidth.set(this.clampDetailWidth(w));
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  onDetailResizeEnd(): void {
    this.detailResize = null;
  }

  onDetailResizeKeydown(ev: KeyboardEvent): void {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    const step = ev.shiftKey ? 40 : 12;
    const delta = ev.key === 'ArrowRight' ? step : -step;
    this.detailPanelWidth.update((w) => this.clampDetailWidth(w + delta));
  }

  private clampDetailWidth(w: number): number {
    const gw = globalThis as unknown as { innerWidth?: number };
    const vw =
      typeof gw.innerWidth === 'number' && Number.isFinite(gw.innerWidth)
        ? gw.innerWidth
        : 1280;
    const max = Math.min(960, Math.floor(vw * 0.92));
    return Math.max(200, Math.min(max, Math.round(w)));
  }
}

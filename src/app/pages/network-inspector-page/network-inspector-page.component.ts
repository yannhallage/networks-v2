import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Subject, filter, takeUntil } from 'rxjs';
import { NetworkPanelComponent } from '../../features/network/network-panel/network-panel.component';
import { RequestDetailComponent } from '../../features/network/request-detail/request-detail.component';
import { NetworkStore } from '../../core/network.store';
import type { NetworkRequest } from '../../core/types';
import { WebSocketService } from '../../core/websocket.service';

@Component({
  selector: 'app-network-inspector-page',
  imports: [NetworkPanelComponent, RequestDetailComponent],
  templateUrl: './network-inspector-page.component.html',
  host: {
    class:
      'flex min-h-0 max-w-full flex-1 flex-col overflow-hidden box-border w-full',
  },
})
export class NetworkInspectorPageComponent implements OnInit, OnDestroy {
  private readonly ws = inject(WebSocketService);
  readonly store = inject(NetworkStore);
  private readonly destroy$ = new Subject<void>();

  selected: NetworkRequest | null = null;
  comparePair: [NetworkRequest, NetworkRequest] | null = null;

  /** Largeur du panneau détails (px), redimensionnable par glisser la poignée. */
  readonly detailPanelWidth = signal(320);
  private detailResize: { startX: number; startW: number } | null = null;

  ngOnInit(): void {
    this.ws.connect();
    this.ws.messages$
      .pipe(
        filter(
          (m: any) =>
            m?.type === 'network_request' && m.payload != null,
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((m: any) =>
        this.store.addRequest(m.payload as NetworkRequest),
      );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.ws.disconnect();
  }

  onSelect(req: NetworkRequest): void {
    this.selected = req;
  }

  onCompare(pair: [NetworkRequest, NetworkRequest]): void {
    this.comparePair = pair;
    this.selected = pair[0];
  }

  onSessionImported(requests: NetworkRequest[]): void {
    this.store.setRequests(requests);
    this.selected = null;
    this.comparePair = null;
  }

  onPanelCleared(): void {
    this.selected = null;
    this.comparePair = null;
  }

  onReplayCaptured(request: NetworkRequest): void {
    this.store.addRequest(request);
    this.selected = request;
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

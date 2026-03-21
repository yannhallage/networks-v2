import { AsyncPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, filter, takeUntil } from 'rxjs';
import { NetworkPanelComponent } from './components/network-panel/network-panel.component';
import { RequestDetailComponent } from './components/request-detail/request-detail.component';
import { NetworkStore } from './core/network.store';
import type { NetworkRequest } from './core/types';
import { WebSocketService } from './core/websocket.service';

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, NetworkPanelComponent, RequestDetailComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly ws = inject(WebSocketService);
  readonly store = inject(NetworkStore);
  private readonly destroy$ = new Subject<void>();

  readonly requests$ = this.store.requests$;
  selected: NetworkRequest | null = null;

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
}

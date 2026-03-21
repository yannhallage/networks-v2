import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { DEFAULT_NETWORK_REQUESTS } from '../data/default-network.data';
import type { NetworkRequest } from './types';

@Injectable({ providedIn: 'root' })
export class NetworkStore {
  private readonly requestsSubject = new BehaviorSubject<NetworkRequest[]>(
    [...DEFAULT_NETWORK_REQUESTS],
  );

  readonly requests$: Observable<NetworkRequest[]> = this.requestsSubject.asObservable();

  addRequest(request: NetworkRequest): void {
    const next = [...this.requestsSubject.value, request];
    this.requestsSubject.next(next);
  }

  selectRequestById(id: string): Observable<NetworkRequest | undefined> {
    return this.requests$.pipe(map((list) => list.find((r) => r.id === id)));
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import type { NetworkRequest } from './types';

@Injectable({ providedIn: 'root' })
export class NetworkStore {
  private readonly requestsSubject = new BehaviorSubject<NetworkRequest[]>([]);

  readonly requests$: Observable<NetworkRequest[]> = this.requestsSubject.asObservable();

  addRequest(request: NetworkRequest): void {
    const next = [...this.requestsSubject.value, request];
    this.requestsSubject.next(next);
  }

  setRequests(requests: NetworkRequest[]): void {
    this.requestsSubject.next([...requests]);
  }

  selectRequestById(id: string): Observable<NetworkRequest | undefined> {
    return this.requests$.pipe(map((list) => list.find((r) => r.id === id)));
  }
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

type ApiTesterHttpHeader = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  description: string;
};

@Component({
  selector: 'app-api-tester-headers-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-headers-item.component.html',
})
export class ApiTesterHeadersItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';

  @Output() headersChanged = new EventEmitter<ApiTesterHttpHeader[]>();

  readonly headers = signal<ApiTesterHttpHeader[]>([]);

  addHeader(): void {
    this.headers.update((curr) => [
      ...curr,
      { id: this.nextId(), enabled: true, key: '', value: '', description: '' },
    ]);
    this.emitChange();
  }

  removeHeader(id: string): void {
    this.headers.update((curr) => curr.filter((h) => h.id !== id));
    this.emitChange();
  }

  setEnabled(id: string, enabled: boolean): void {
    this.headers.update((curr) => curr.map((h) => (h.id === id ? { ...h, enabled } : h)));
    this.emitChange();
  }

  setKey(id: string, key: string): void {
    this.headers.update((curr) => curr.map((h) => (h.id === id ? { ...h, key } : h)));
    this.emitChange();
  }

  setValue(id: string, value: string): void {
    this.headers.update((curr) => curr.map((h) => (h.id === id ? { ...h, value } : h)));
    this.emitChange();
  }

  setDescription(id: string, description: string): void {
    this.headers.update((curr) => curr.map((h) => (h.id === id ? { ...h, description } : h)));
    this.emitChange();
  }

  private emitChange(): void {
    this.headersChanged.emit(this.headers());
  }

  private nextId(): string {
    const maybeCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
    if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

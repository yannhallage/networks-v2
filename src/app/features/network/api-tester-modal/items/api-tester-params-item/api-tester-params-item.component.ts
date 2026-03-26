import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

type ApiTesterQueryParam = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  description: string;
};

@Component({
  selector: 'app-api-tester-params-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-params-item.component.html',
})
export class ApiTesterParamsItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';

  @Output() paramsChanged = new EventEmitter<ApiTesterQueryParam[]>();

  readonly params = signal<ApiTesterQueryParam[]>([]);

  addParam(): void {
    this.params.update((curr) => [
      ...curr,
      { id: this.nextId(), enabled: true, key: '', value: '', description: '' },
    ]);
    this.emitChange();
  }

  removeParam(id: string): void {
    this.params.update((curr) => curr.filter((p) => p.id !== id));
    this.emitChange();
  }

  setEnabled(id: string, enabled: boolean): void {
    this.params.update((curr) => curr.map((p) => (p.id === id ? { ...p, enabled } : p)));
    this.emitChange();
  }

  setKey(id: string, key: string): void {
    this.params.update((curr) => curr.map((p) => (p.id === id ? { ...p, key } : p)));
    this.emitChange();
  }

  setValue(id: string, value: string): void {
    this.params.update((curr) => curr.map((p) => (p.id === id ? { ...p, value } : p)));
    this.emitChange();
  }

  setDescription(id: string, description: string): void {
    this.params.update((curr) => curr.map((p) => (p.id === id ? { ...p, description } : p)));
    this.emitChange();
  }

  private emitChange(): void {
    this.paramsChanged.emit(this.params());
  }

  private nextId(): string {
    // Works in browsers; fallback keeps uniqueness acceptable for UI.
    const maybeCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
    if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

import { Component, input } from '@angular/core';
import type { NetworkRequest } from '../../../../core/types';

@Component({
  selector: 'app-detail-headers',
  standalone: true,
  templateUrl: './detail-headers.component.html',
  host: {
    class:
      'inspector-scrollbar block min-h-0 flex-1 overflow-auto bg-white font-sans text-[11px] text-neutral-800 antialiased',
  },
})
export class DetailHeadersComponent {
  readonly request = input.required<NetworkRequest>();

  statusLine(): string {
    const s = this.request().status;
    if (s == null || s === 0) {
      return '(failed)';
    }
    const text = s === 200 ? '200 OK' : String(s);
    return text;
  }

  statusOk(): boolean {
    const s = this.request().status;
    return s != null && s >= 200 && s < 300;
  }

  entries(record: Record<string, string> | undefined): [string, string][] {
    if (!record || Object.keys(record).length === 0) {
      return [];
    }
    return Object.entries(record).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }
}

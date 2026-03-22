import { Component, computed, input } from '@angular/core';
import type { NetworkRequest } from '../../../../core/types';

@Component({
  selector: 'app-detail-response',
  standalone: true,
  templateUrl: './detail-response.component.html',
  host: {
    class:
      'flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-white font-mono text-[12px] text-neutral-800',
  },
})
export class DetailResponseComponent {
  readonly request = input.required<NetworkRequest>();

  readonly formatted = computed((): string => {
    const raw = this.request().responseBody;
    if (raw === undefined || raw === null) {
      return '—';
    }
    if (typeof raw === 'string') {
      const t = raw.trim();
      if (!t) {
        return '';
      }
      try {
        const j = JSON.parse(t) as unknown;
        return JSON.stringify(j, null, 2);
      } catch {
        return raw;
      }
    }
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return String(raw);
    }
  });

  readonly lineRows = computed(() => {
    const text = this.formatted();
    if (text === '') {
      return [{ num: 1, content: '' }];
    }
    const lines = text.split('\n');
    return lines.map((content, i) => ({ num: i + 1, content }));
  });
}

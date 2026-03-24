import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import type { NetworkRequest } from '../../../../core/types';

type DiffState = 'same' | 'changed' | 'only-left' | 'only-right';

@Component({
  selector: 'app-detail-compare',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detail-compare.component.html',
  host: {
    class: 'rd-pane rd-compare inspector-scrollbar block min-h-0 flex-1 overflow-auto px-2 py-2 text-[11px]',
  },
})
export class DetailCompareComponent {
  readonly pair = input.required<[NetworkRequest, NetworkRequest]>();

  readonly headerRows = computed(() => {
    const [a, b] = this.pair();
    const left = { ...(a.requestHeaders ?? {}), ...(a.responseHeaders ?? {}) };
    const right = { ...(b.requestHeaders ?? {}), ...(b.responseHeaders ?? {}) };
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
    return keys.map((key) => {
      const lv = left[key];
      const rv = right[key];
      const state: DiffState = lv == null ? 'only-right' : rv == null ? 'only-left' : lv === rv ? 'same' : 'changed';
      return { key, left: lv ?? '—', right: rv ?? '—', state };
    });
  });

  readonly requestBody = computed(() => {
    const [a, b] = this.pair();
    return this.buildTextBlockDiff(a.requestBody, b.requestBody);
  });

  readonly responseBody = computed(() => {
    const [a, b] = this.pair();
    return this.buildTextBlockDiff(a.responseBody, b.responseBody);
  });

  rowClass(state: DiffState): string {
    if (state === 'changed') return 'bg-amber-50';
    if (state === 'only-left' || state === 'only-right') return 'bg-red-50';
    return '';
  }

  private buildTextBlockDiff(left: unknown, right: unknown): { left: string; right: string; different: boolean } {
    const a = this.formatUnknown(left);
    const b = this.formatUnknown(right);
    return { left: a, right: b, different: a !== b };
  }

  private formatUnknown(v: unknown): string {
    if (v == null) return '—';
    if (typeof v === 'string') return v;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
}

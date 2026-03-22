import { Component, computed, input } from '@angular/core';
import type { NetworkRequest } from '../../../../core/types';
import { JsonTreeNodeComponent } from './json-tree-node.component';

@Component({
  selector: 'app-detail-preview',
  standalone: true,
  imports: [JsonTreeNodeComponent],
  templateUrl: './detail-preview.component.html',
  host: {
    class: 'inspector-scrollbar block min-h-0 flex-1 overflow-auto bg-white px-2 py-2',
  },
})
export class DetailPreviewComponent {
  readonly request = input.required<NetworkRequest>();

  readonly parsed = computed((): unknown | null => {
    const raw = this.request().responseBody;
    if (raw === undefined || raw === null) {
      return null;
    }
    if (typeof raw === 'string') {
      const t = raw.trim();
      if (!t) return '';
      try {
        return JSON.parse(t) as unknown;
      } catch {
        return raw;
      }
    }
    return raw;
  });

  /** Objet ou tableau JSON pour l’arborescence (hors `null`). */
  readonly treeRoot = computed((): unknown | null => {
    const p = this.parsed();
    if (p === null || typeof p !== 'object') {
      return null;
    }
    return p;
  });
}

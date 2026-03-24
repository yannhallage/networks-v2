import { Component, forwardRef, input, signal } from '@angular/core';

@Component({
  selector: 'app-json-tree-node',
  standalone: true,
  imports: [forwardRef(() => JsonTreeNodeComponent)],
  templateUrl: './json-tree-node.component.html',
  host: { class: 'block font-mono text-[12px] leading-snug text-neutral-800' },
})
export class JsonTreeNodeComponent {
  readonly value = input.required<unknown>();
  /** Libellé optionnel (clé d’objet ou index de tableau). */
  readonly label = input<string | undefined>(undefined);

  readonly expanded = signal(true);

  toggle(): void {
    this.expanded.update((v) => !v);
  }

  kind(): 'null' | 'undefined' | 'string' | 'number' | 'boolean' | 'array' | 'object' {
    const v = this.value();
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (Array.isArray(v)) return 'array';
    const t = typeof v;
    if (t === 'string') return 'string';
    if (t === 'number') return 'number';
    if (t === 'boolean') return 'boolean';
    if (t === 'object') return 'object';
    return 'string';
  }

  objectEntries(): { key: string; val: unknown }[] {
    const v = this.value();
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return [];
    return Object.keys(v as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((key) => ({ key, val: (v as Record<string, unknown>)[key] }));
  }

  asArray(): unknown[] {
    const v = this.value();
    return Array.isArray(v) ? v : [];
  }

  displayString(): string {
    const v = this.value();
    return typeof v === 'string' ? v : String(v);
  }
}

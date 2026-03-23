import { Component, computed, input, signal } from '@angular/core';
import type { NetworkRequest } from '../../../../core/types';

@Component({
  selector: 'app-detail-response',
  standalone: true,
  templateUrl: './detail-response.component.html',
  host: {
    class:
      'rd-pane rd-response flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden font-mono text-[12px] text-neutral-800',
  },
})
export class DetailResponseComponent {
  readonly request = input.required<NetworkRequest>();
  readonly useJsonColors = signal(true);
  private readonly jsonToken =
    /"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b|[{}\[\]]|:|,/g;

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
      return [{ num: 1, segments: [{ text: '', kind: 'plain' as const }] }];
    }
    const lines = text.split('\n');
    return lines.map((content, i) => ({
      num: i + 1,
      segments: this.tokenizeJsonLine(content),
    }));
  });

  tokenClass(kind: JsonTokenKind): string {
    if (!this.useJsonColors()) {
      return 'text-neutral-800';
    }

    switch (kind) {
      case 'key':
        return 'text-[#0072bb]'; // French Blue
      case 'string':
        return 'text-[#009f6b]'; // NCS Green
      case 'number':
        return 'text-[#ff7f00]'; // Orange
      case 'boolean':
        return 'text-[#8a2be2]'; // Blue Violet
      case 'null':
        return 'text-[#e40078]'; // Red Purple
      case 'brace':
        return 'text-[#5d8aa8]'; // Royal Air Force Blue
      case 'colon':
      case 'comma':
        return 'text-[#6d6c6c]'; // Dove Gray
      default:
        return 'text-neutral-800';
    }
  }

  toggleJsonColors(): void {
    this.useJsonColors.update((enabled) => !enabled);
  }

  private tokenizeJsonLine(line: string): JsonTokenSegment[] {
    const segments: JsonTokenSegment[] = [];
    let lastIndex = 0;
    this.jsonToken.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = this.jsonToken.exec(line)) !== null) {
      const token = match[0];
      const start = match.index;
      if (start > lastIndex) {
        segments.push({ text: line.slice(lastIndex, start), kind: 'plain' });
      }

      segments.push({ text: token, kind: this.getTokenKind(token, line, start + token.length) });
      lastIndex = start + token.length;
    }

    if (lastIndex < line.length) {
      segments.push({ text: line.slice(lastIndex), kind: 'plain' });
    }

    return segments.length ? segments : [{ text: line, kind: 'plain' }];
  }

  private getTokenKind(token: string, line: string, tokenEnd: number): JsonTokenKind {
    if (token === ':' || token === ',') {
      return token === ':' ? 'colon' : 'comma';
    }
    if (token === 'true' || token === 'false') {
      return 'boolean';
    }
    if (token === 'null') {
      return 'null';
    }
    if (token[0] === '"' && token.endsWith('"')) {
      let i = tokenEnd;
      while (i < line.length && line[i] === ' ') {
        i += 1;
      }
      return i < line.length && line[i] === ':' ? 'key' : 'string';
    }
    if (token[0] === '{' || token[0] === '[' || token[0] === '}' || token[0] === ']') {
      return 'brace';
    }
    return /^-?\d/.test(token) ? 'number' : 'plain';
  }
}

type JsonTokenKind =
  | 'key'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'brace'
  | 'colon'
  | 'comma'
  | 'plain';

type JsonTokenSegment = {
  text: string;
  kind: JsonTokenKind;
};

import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  signal,
} from '@angular/core';

type ApiTesterBodyMode =
  | 'none'
  | 'form-data'
  | 'x-www-form-urlencoded'
  | 'raw'
  | 'binary'
  | 'graphql';

type ApiTesterRawFormat = 'text' | 'javascript' | 'json' | 'html' | 'xml';

type ApiTesterBodyFormRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
};

type ApiTesterBodySnapshot = {
  mode: ApiTesterBodyMode;
  rawFormat: ApiTesterRawFormat;
  raw: string;
  graphqlQuery: string;
  graphqlVariables: string;
  formData: ApiTesterBodyFormRow[];
  urlEncoded: ApiTesterBodyFormRow[];
  binary: File | null;
};

@Component({
  selector: 'app-api-tester-body-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-body-item.component.html',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
  },
})
export class ApiTesterBodyItemComponent {
  @ViewChild('binaryFileInput') private binaryFileInput?: ElementRef<HTMLInputElement>;

  @Input({ required: true }) theme: 'light' | 'dark' = 'light';

  @Output() bodyChanged = new EventEmitter<ApiTesterBodySnapshot>();
  @Output() schemaAction = new EventEmitter<void>();
  @Output() cookiesAction = new EventEmitter<void>();

  readonly bodyMode = signal<ApiTesterBodyMode>('raw');
  readonly rawFormat = signal<ApiTesterRawFormat>('json');
  readonly rawContent = signal('');
  readonly graphqlQuery = signal('');
  readonly graphqlVariables = signal('{}');
  readonly formRows = signal<ApiTesterBodyFormRow[]>([]);
  readonly urlEncodedRows = signal<ApiTesterBodyFormRow[]>([]);
  readonly binaryFile = signal<File | null>(null);

  readonly rawScrollTop = signal(0);
  readonly graphqlScrollTop = signal(0);
  readonly graphqlVarsScrollTop = signal(0);

  readonly bodyModeOptions: { value: ApiTesterBodyMode; label: string }[] = [
    { value: 'none', label: 'none' },
    { value: 'form-data', label: 'form-data' },
    { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
    { value: 'raw', label: 'raw' },
    { value: 'binary', label: 'binary' },
    { value: 'graphql', label: 'GraphQL' },
  ];

  readonly rawFormatOptions: { value: ApiTesterRawFormat; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'json', label: 'JSON' },
    { value: 'html', label: 'HTML' },
    { value: 'xml', label: 'XML' },
  ];

  readonly canBeautify = computed(() => {
    const m = this.bodyMode();
    return m === 'raw' || m === 'graphql';
  });

  readonly rawLineCount = computed(() =>
    this.lineIndices(this.rawContent()),
  );

  readonly graphqlLineCount = computed(() =>
    this.lineIndices(this.graphqlQuery()),
  );

  readonly graphqlVarsLineCount = computed(() =>
    this.lineIndices(this.graphqlVariables()),
  );

  setBodyMode(mode: ApiTesterBodyMode): void {
    this.bodyMode.set(mode);
    this.emitChange();
  }

  setRawFormat(value: string): void {
    const allowed: ApiTesterRawFormat[] = [
      'text',
      'javascript',
      'json',
      'html',
      'xml',
    ];
    if (!allowed.includes(value as ApiTesterRawFormat)) return;
    this.rawFormat.set(value as ApiTesterRawFormat);
    this.emitChange();
  }

  setRawContent(value: string): void {
    this.rawContent.set(value);
    this.emitChange();
  }

  setGraphqlQuery(value: string): void {
    this.graphqlQuery.set(value);
    this.emitChange();
  }

  setGraphqlVariables(value: string): void {
    this.graphqlVariables.set(value);
    this.emitChange();
  }

  onRawScroll(scrollTop: number): void {
    this.rawScrollTop.set(scrollTop);
  }

  onGraphqlScroll(scrollTop: number): void {
    this.graphqlScrollTop.set(scrollTop);
  }

  onGraphqlVarsScroll(scrollTop: number): void {
    this.graphqlVarsScrollTop.set(scrollTop);
  }

  addFormRow(): void {
    this.formRows.update((rows) => [
      ...rows,
      { id: this.nextId(), enabled: true, key: '', value: '' },
    ]);
    this.emitChange();
  }

  removeFormRow(id: string): void {
    this.formRows.update((rows) => rows.filter((r) => r.id !== id));
    this.emitChange();
  }

  setFormEnabled(id: string, enabled: boolean): void {
    this.formRows.update((rows) =>
      rows.map((r) => (r.id === id ? { ...r, enabled } : r)),
    );
    this.emitChange();
  }

  setFormKey(id: string, key: string): void {
    this.formRows.update((rows) =>
      rows.map((r) => (r.id === id ? { ...r, key } : r)),
    );
    this.emitChange();
  }

  setFormValue(id: string, value: string): void {
    this.formRows.update((rows) =>
      rows.map((r) => (r.id === id ? { ...r, value } : r)),
    );
    this.emitChange();
  }

  addUrlEncodedRow(): void {
    this.urlEncodedRows.update((rows) => [
      ...rows,
      { id: this.nextId(), enabled: true, key: '', value: '' },
    ]);
    this.emitChange();
  }

  removeUrlEncodedRow(id: string): void {
    this.urlEncodedRows.update((rows) => rows.filter((r) => r.id !== id));
    this.emitChange();
  }

  setUrlEncodedEnabled(id: string, enabled: boolean): void {
    this.urlEncodedRows.update((rows) =>
      rows.map((r) => (r.id === id ? { ...r, enabled } : r)),
    );
    this.emitChange();
  }

  setUrlEncodedKey(id: string, key: string): void {
    this.urlEncodedRows.update((rows) =>
      rows.map((r) => (r.id === id ? { ...r, key } : r)),
    );
    this.emitChange();
  }

  setUrlEncodedValue(id: string, value: string): void {
    this.urlEncodedRows.update((rows) =>
      rows.map((r) => (r.id === id ? { ...r, value } : r)),
    );
    this.emitChange();
  }

  onBinarySelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.binaryFile.set(file);
    this.emitChange();
  }

  clearBinary(): void {
    this.binaryFile.set(null);
    const el = this.binaryFileInput?.nativeElement;
    if (el) el.value = '';
    this.emitChange();
  }

  beautify(): void {
    if (this.bodyMode() === 'graphql') {
      this.beautifyGraphqlVariables();
      return;
    }
    if (this.bodyMode() !== 'raw') return;
    const fmt = this.rawFormat();
    const text = this.rawContent();
    if (fmt === 'json') {
      try {
        const parsed = JSON.parse(text);
        this.rawContent.set(JSON.stringify(parsed, null, 2));
        this.emitChange();
      } catch {
        /* ignore invalid JSON */
      }
      return;
    }
    if (fmt === 'javascript') {
      try {
        const parsed = JSON.parse(text);
        this.rawContent.set(JSON.stringify(parsed, null, 2));
        this.emitChange();
      } catch {
        /* not JSON-like */
      }
    }
  }

  private beautifyGraphqlVariables(): void {
    const text = this.graphqlVariables();
    try {
      const parsed = JSON.parse(text);
      this.graphqlVariables.set(JSON.stringify(parsed, null, 2));
      this.emitChange();
    } catch {
      /* ignore */
    }
  }

  onSchemaClick(): void {
    this.schemaAction.emit();
  }

  onCookiesClick(): void {
    this.cookiesAction.emit();
  }

  private lineIndices(text: string): number[] {
    const n = Math.max(1, text.split('\n').length);
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  private emitChange(): void {
    this.bodyChanged.emit(this.snapshot());
  }

  private snapshot(): ApiTesterBodySnapshot {
    return {
      mode: this.bodyMode(),
      rawFormat: this.rawFormat(),
      raw: this.rawContent(),
      graphqlQuery: this.graphqlQuery(),
      graphqlVariables: this.graphqlVariables(),
      formData: this.formRows().map((r) => ({ ...r })),
      urlEncoded: this.urlEncodedRows().map((r) => ({ ...r })),
      binary: this.binaryFile(),
    };
  }

  private nextId(): string {
    const c = typeof crypto !== 'undefined' ? crypto : undefined;
    if (c?.randomUUID) return c.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

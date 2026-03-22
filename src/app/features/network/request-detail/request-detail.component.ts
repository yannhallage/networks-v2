import { Component, effect, input, output, signal } from '@angular/core';
import type { NetworkRequest } from '../../../core/types';
import { DetailHeadersComponent } from './detail-headers/detail-headers.component';
import { DetailPreviewComponent } from './detail-preview/detail-preview.component';
import { DetailResponseComponent } from './detail-response/detail-response.component';

export type RequestDetailTab = 'headers' | 'preview' | 'response';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [DetailHeadersComponent, DetailPreviewComponent, DetailResponseComponent],
  templateUrl: './request-detail.component.html',
  styles: [
    `
      .detail-tab {
        margin-bottom: -1px;
        border-bottom: 3px solid transparent;
        padding: 0.4rem 0.65rem 0.35rem;
        font-size: 11px;
        font-weight: 400;
        color: #5f6368;
        background: transparent;
        border-top: 0;
        border-left: 0;
        border-right: 0;
        cursor: pointer;
        font-family: inherit;
      }
      .detail-tab:hover {
        color: #202124;
      }
      .detail-tab-active {
        color: #1a73e8;
        font-weight: 500;
        border-bottom-color: #1a73e8;
      }
    `,
  ],
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class RequestDetailComponent {
  readonly request = input<NetworkRequest | null>(null);
  readonly closePanel = output<void>();

  readonly activeTab = signal<RequestDetailTab>('headers');

  readonly tabs: { id: RequestDetailTab; label: string }[] = [
    { id: 'headers', label: 'Headers' },
    { id: 'preview', label: 'Preview' },
    { id: 'response', label: 'Response' },
  ];

  constructor() {
    effect(() => {
      if (this.request()) {
        this.activeTab.set('headers');
      }
    });
  }

  selectTab(tab: RequestDetailTab): void {
    this.activeTab.set(tab);
  }

  onClose(): void {
    this.closePanel.emit();
  }
}

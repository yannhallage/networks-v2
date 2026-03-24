import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import type { NetworkRequest } from '../../../core/types';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [MatTableModule],
  templateUrl: './request-list.component.html',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class RequestListComponent {
  @Input() requests: NetworkRequest[] = [];
  @Output() selected = new EventEmitter<NetworkRequest>();

  readonly displayedColumns: (keyof Pick<NetworkRequest, 'method' | 'url' | 'status'>)[] = [
    'method',
    'url',
    'status',
  ];

  onRowClick(row: NetworkRequest): void {
    this.selected.emit(row);
  }
}

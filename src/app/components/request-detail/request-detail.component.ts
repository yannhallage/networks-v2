import { JsonPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { NetworkRequest } from '../../core/types';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './request-detail.component.html',
})
export class RequestDetailComponent {
  @Input() request: NetworkRequest | null = null;
}

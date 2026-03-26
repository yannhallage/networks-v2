import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-api-tester-headers-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-headers-item.component.html',
})
export class ApiTesterHeadersItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';
}

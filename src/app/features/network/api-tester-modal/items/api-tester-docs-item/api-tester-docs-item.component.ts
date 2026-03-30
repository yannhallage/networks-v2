import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-api-tester-docs-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-docs-item.component.html',
})
export class ApiTesterDocsItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';
}

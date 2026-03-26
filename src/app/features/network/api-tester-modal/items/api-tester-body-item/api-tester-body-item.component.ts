import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-api-tester-body-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-body-item.component.html',
})
export class ApiTesterBodyItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';
}

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-api-tester-settings-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-settings-item.component.html',
})
export class ApiTesterSettingsItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';
}

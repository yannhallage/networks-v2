import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-api-tester-scripts-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-scripts-item.component.html',
})
export class ApiTesterScriptsItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';
}

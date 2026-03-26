import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-api-tester-authorization-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-authorization-item.component.html',
})
export class ApiTesterAuthorizationItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ApiTesterAuthorizationItemComponent } from './items/api-tester-authorization-item/api-tester-authorization-item.component';
import { ApiTesterBodyItemComponent } from './items/api-tester-body-item/api-tester-body-item.component';
import { ApiTesterDocsItemComponent } from './items/api-tester-docs-item/api-tester-docs-item.component';
import { ApiTesterHeadersItemComponent } from './items/api-tester-headers-item/api-tester-headers-item.component';
import { ApiTesterParamsItemComponent } from './items/api-tester-params-item/api-tester-params-item.component';
import { ApiTesterScriptsItemComponent } from './items/api-tester-scripts-item/api-tester-scripts-item.component';
import { ApiTesterSettingsItemComponent } from './items/api-tester-settings-item/api-tester-settings-item.component';

type ApiTesterMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ApiTesterTab = 'docs' | 'params' | 'authorization' | 'headers' | 'body' | 'scripts' | 'settings';

@Component({
  selector: 'app-api-tester-modal',
  standalone: true,
  imports: [
    CommonModule,
    ApiTesterDocsItemComponent,
    ApiTesterParamsItemComponent,
    ApiTesterAuthorizationItemComponent,
    ApiTesterHeadersItemComponent,
    ApiTesterBodyItemComponent,
    ApiTesterScriptsItemComponent,
    ApiTesterSettingsItemComponent,
  ],
  templateUrl: './api-tester-modal.component.html',
})
export class ApiTesterModalComponent {
  @Input({ required: true }) open = false;
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';
  @Output() closed = new EventEmitter<void>();

  readonly method = signal<ApiTesterMethod>('GET');
  readonly activeTab = signal<ApiTesterTab>('docs');

  readonly methods: ApiTesterMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  readonly tabs: { id: ApiTesterTab; label: string }[] = [
    { id: 'docs', label: 'Docs' },
    { id: 'params', label: 'Params' },
    { id: 'authorization', label: 'Authorization' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'scripts', label: 'Scripts' },
    { id: 'settings', label: 'Settings' },
  ];

  close(): void {
    this.closed.emit();
  }

  setTab(tab: ApiTesterTab): void {
    this.activeTab.set(tab);
  }

  setMethod(value: string): void {
    if (
      value === 'GET' ||
      value === 'POST' ||
      value === 'PUT' ||
      value === 'PATCH' ||
      value === 'DELETE'
    ) {
      this.method.set(value);
    }
  }
}

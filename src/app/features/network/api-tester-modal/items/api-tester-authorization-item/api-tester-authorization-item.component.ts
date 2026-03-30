import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey';
type ApiKeyLocation = 'header' | 'query';

@Component({
  selector: 'app-api-tester-authorization-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-authorization-item.component.html',
})
export class ApiTesterAuthorizationItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';

  readonly authType = signal<AuthType>('none');
  readonly bearerToken = signal('');
  readonly basicUsername = signal('');
  readonly basicPassword = signal('');
  readonly apiKeyName = signal('');
  readonly apiKeyValue = signal('');
  readonly apiKeyLocation = signal<ApiKeyLocation>('header');

  readonly authOptions: { value: AuthType; label: string }[] = [
    { value: 'none', label: 'No Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'apiKey', label: 'API Key' },
  ];

  readonly apiKeyLocations: { value: ApiKeyLocation; label: string }[] = [
    { value: 'header', label: 'Header' },
    { value: 'query', label: 'Query Params' },
  ];

  setAuthType(value: string): void {
    if (value === 'none' || value === 'bearer' || value === 'basic' || value === 'apiKey') {
      this.authType.set(value);
    }
  }

  setApiKeyLocation(value: string): void {
    if (value === 'header' || value === 'query') {
      this.apiKeyLocation.set(value);
    }
  }

  authLearnMoreLabel(): string {
    const type = this.authType();
    if (type === 'basic') return 'Basic Auth';
    if (type === 'bearer') return 'Bearer Token';
    if (type === 'apiKey') return 'API Key';
    return '';
  }

  authLearnMoreUrl(): string {
    const type = this.authType();
    if (type === 'basic') return 'https://learning.postman.com/docs/sending-requests/authorization/#basic-auth';
    if (type === 'bearer') return 'https://learning.postman.com/docs/sending-requests/authorization/#bearer-token';
    if (type === 'apiKey') return 'https://learning.postman.com/docs/sending-requests/authorization/#api-key';
    return '';
  }
}

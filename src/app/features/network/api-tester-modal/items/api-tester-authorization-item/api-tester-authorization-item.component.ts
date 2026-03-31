import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey';
type ApiKeyLocation = 'header' | 'query';
type ApiTesterAuthorizationSnapshot = {
  type: AuthType;
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyLocation: ApiKeyLocation;
};

@Component({
  selector: 'app-api-tester-authorization-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-tester-authorization-item.component.html',
})
export class ApiTesterAuthorizationItemComponent {
  @Input({ required: true }) theme: 'light' | 'dark' = 'light';
  @Output() authChanged = new EventEmitter<ApiTesterAuthorizationSnapshot>();

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
      this.emitChange();
    }
  }

  setApiKeyLocation(value: string): void {
    if (value === 'header' || value === 'query') {
      this.apiKeyLocation.set(value);
      this.emitChange();
    }
  }

  setBearerToken(value: string): void {
    this.bearerToken.set(value);
    this.emitChange();
  }

  setBasicUsername(value: string): void {
    this.basicUsername.set(value);
    this.emitChange();
  }

  setBasicPassword(value: string): void {
    this.basicPassword.set(value);
    this.emitChange();
  }

  setApiKeyName(value: string): void {
    this.apiKeyName.set(value);
    this.emitChange();
  }

  setApiKeyValue(value: string): void {
    this.apiKeyValue.set(value);
    this.emitChange();
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

  private emitChange(): void {
    this.authChanged.emit({
      type: this.authType(),
      bearerToken: this.bearerToken(),
      basicUsername: this.basicUsername(),
      basicPassword: this.basicPassword(),
      apiKeyName: this.apiKeyName(),
      apiKeyValue: this.apiKeyValue(),
      apiKeyLocation: this.apiKeyLocation(),
    });
  }
}

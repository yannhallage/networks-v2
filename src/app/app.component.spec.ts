import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { NetworkStore } from './core/network.store';
import { WebSocketService } from './core/websocket.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    })
      .overrideProvider(WebSocketService, {
        useValue: {
          connect: (): void => {},
          disconnect: (): void => {},
          messages$: of(),
        },
      })
      .overrideProvider(NetworkStore, {
        useValue: {
          requests$: of([]),
          addRequest: (): void => {},
        },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

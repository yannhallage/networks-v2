import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  host: {
    class:
      'flex min-h-0 max-w-full flex-1 flex-col overflow-hidden box-border w-full',
  },
})
export class AppComponent {}

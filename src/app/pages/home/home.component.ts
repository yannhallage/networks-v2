import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  host: {
    class:
      'flex min-h-0 max-w-full flex-1 flex-col overflow-hidden box-border w-full',
  },
})
export class HomeComponent {
  /** Ruban « bêta » (image externe). */
  readonly betaRibbonBadgeUrl =
    'https://imgs.search.brave.com/8-Y5C52xM3ndOeOo-fO0mc8-QbRbBzCQ6o0IdNC2yr4/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90aHVt/YnMuZHJlYW1zdGlt/ZS5jb20vYi9iZXRh/LXRlc3Rpbmctc2ls/dmVyLWJhZGdlLWJs/dWUtcmliYm9uLWJl/dGEtdGVzdGluZy1i/ZXRhLXRlc3Rpbmct/MTIwMzc2NDI3Lmpw/Zw';
}

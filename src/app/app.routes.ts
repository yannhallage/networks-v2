import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { NetworkInspectorPageComponent } from './pages/network-inspector-page/network-inspector-page.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'inspector', component: NetworkInspectorPageComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

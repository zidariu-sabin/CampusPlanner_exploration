import { Routes } from '@angular/router';

import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';
import { AppShellComponent } from './layout/app-shell.component';
import { AuthPageComponent } from './pages/auth-page.component';
import { DashboardPageComponent } from './pages/dashboard-page.component';
import { MapEditorDashboardPageComponent } from './pages/map-editor-dashboard-page.component';
import { MapBookingPageComponent } from './pages/map-booking-page.component';
import { MapEditorPageComponent } from './pages/map-editor-page.component';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthPageComponent,
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        component: DashboardPageComponent,
      },
      {
        path: 'maps/new',
        component: MapEditorPageComponent,
        data: { workflow: 'map' },
        canActivate: [adminGuard],
      },
      {
        path: 'maps/:mapId/edit',
        component: MapEditorDashboardPageComponent,
        canActivate: [adminGuard],
      },
      {
        path: 'maps/:mapId/edit/map',
        component: MapEditorPageComponent,
        data: { workflow: 'map' },
        canActivate: [adminGuard],
      },
      {
        path: 'maps/:mapId/edit/rooms',
        component: MapEditorPageComponent,
        data: { workflow: 'rooms' },
        canActivate: [adminGuard],
      },
      {
        path: 'maps/:mapId/book',
        component: MapBookingPageComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

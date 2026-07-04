import { Routes } from '@angular/router';

import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';
import { AppShellComponent } from './layout/app-shell.component';
import { AdminDashboardPageComponent } from './pages/admin-dashboard-page.component';
import { AdminSettingsPageComponent } from './pages/admin-settings-page.component';
import { AuthPageComponent } from './pages/auth-page.component';
import { BookingDetailPageComponent } from './pages/booking-detail-page.component';
import { BookingPageComponent } from './pages/booking-page.component';
import { CampusConfigPageComponent } from './pages/campus-config-page.component';
import { MapEditorDashboardPageComponent } from './pages/map-editor-dashboard-page.component';
import { MapEditorPageComponent } from './pages/map-editor-page.component';
import { MemberDashboardPageComponent } from './pages/member-dashboard-page.component';
import { MemberMapPageComponent } from './pages/member-map-page.component';
import { SpaceConfigPageComponent } from './pages/space-config-page.component';

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
      // Member area
      {
        path: '',
        component: MemberDashboardPageComponent,
      },
      {
        path: 'map',
        component: MemberMapPageComponent,
      },
      {
        path: 'book',
        component: BookingPageComponent,
      },
      {
        path: 'book/:resourceId',
        component: BookingPageComponent,
      },
      {
        path: 'bookings/:meetingId',
        component: BookingDetailPageComponent,
      },
      // Admin area
      {
        path: 'admin',
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'dashboard',
          },
          {
            path: 'dashboard',
            component: AdminDashboardPageComponent,
          },
          {
            path: 'campuses/:campusId',
            component: CampusConfigPageComponent,
          },
          {
            path: 'spaces',
            component: SpaceConfigPageComponent,
          },
          {
            path: 'settings',
            component: AdminSettingsPageComponent,
          },
          {
            path: 'buildings/:buildingId/floors/new',
            component: MapEditorPageComponent,
            data: { workflow: 'map' },
          },
          {
            path: 'floors/:mapId/edit',
            component: MapEditorDashboardPageComponent,
          },
          {
            path: 'floors/:mapId/edit/map',
            component: MapEditorPageComponent,
            data: { workflow: 'map' },
          },
          {
            path: 'floors/:mapId/edit/rooms',
            component: MapEditorPageComponent,
            data: { workflow: 'rooms' },
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

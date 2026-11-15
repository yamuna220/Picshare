import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { RegisterComponent } from './features/auth/pages/register/register.component';
import { MyProfileComponent } from './features/profile/pages/my-profile/my-profile.component';
import { EditProfileComponent } from './features/profile/pages/edit-profile/edit-profile.component';
import { UserProfileComponent } from './features/profile/pages/user-profile/user-profile.component';
import { FollowersComponent } from './features/social/pages/followers/followers.component';
import { FollowingComponent } from './features/social/pages/following/following.component';
import { FollowRequestsComponent } from './features/social/pages/follow-requests/follow-requests.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () =>
          import('./features/feed/feed.module').then((m) => m.FeedModule),
      },
      {
        path: 'search',
        loadChildren: () =>
          import('./features/search/search.module').then((m) => m.SearchModule),
      },
      {
        path: 'explore',
        loadChildren: () =>
          import('./features/explore/explore.module').then((m) => m.ExploreModule),
      },
      {
        path: 'create',
        loadChildren: () =>
          import('./features/post/post.module').then((m) => m.PostModule),
      },
      {
        path: 'posts',
        loadChildren: () =>
          import('./features/post/post.module').then((m) => m.PostModule),
      },
      { path: 'profile', component: MyProfileComponent },
      { path: 'profile/edit', component: EditProfileComponent },
      { path: 'profile/followers', component: FollowersComponent },
      { path: 'profile/following', component: FollowingComponent },
      { path: 'users/:username', component: UserProfileComponent },
      { path: 'users/:username/followers', component: FollowersComponent },
      { path: 'users/:username/following', component: FollowingComponent },
      { path: 'requests', component: FollowRequestsComponent },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./features/notifications/notifications.module').then(
            (m) => m.NotificationsModule
          ),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.module').then(
            (m) => m.SettingsModule
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

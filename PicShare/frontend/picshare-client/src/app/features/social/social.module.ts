import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { FollowersComponent } from './pages/followers/followers.component';
import { FollowingComponent } from './pages/following/following.component';
import { FollowRequestsComponent } from './pages/follow-requests/follow-requests.component';

@NgModule({
  declarations: [FollowersComponent, FollowingComponent, FollowRequestsComponent],
  imports: [SharedModule],
  exports: [FollowersComponent, FollowingComponent, FollowRequestsComponent],
})
export class SocialModule {}

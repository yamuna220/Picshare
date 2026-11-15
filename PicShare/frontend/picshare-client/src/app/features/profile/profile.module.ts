import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { MyProfileComponent } from './pages/my-profile/my-profile.component';
import { EditProfileComponent } from './pages/edit-profile/edit-profile.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';

@NgModule({
  declarations: [MyProfileComponent, EditProfileComponent, UserProfileComponent],
  imports: [SharedModule],
  exports: [MyProfileComponent, EditProfileComponent, UserProfileComponent],
})
export class ProfileModule {}

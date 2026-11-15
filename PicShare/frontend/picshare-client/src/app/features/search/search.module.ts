import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { SearchUsersComponent } from './pages/search-users/search-users.component';

const routes: Routes = [{ path: '', component: SearchUsersComponent }];

@NgModule({
  declarations: [SearchUsersComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class SearchModule {}

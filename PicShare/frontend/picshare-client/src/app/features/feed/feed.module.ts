import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { HomeFeedComponent } from './pages/home-feed/home-feed.component';

const routes: Routes = [{ path: '', component: HomeFeedComponent }];

@NgModule({
  declarations: [HomeFeedComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class FeedModule {}

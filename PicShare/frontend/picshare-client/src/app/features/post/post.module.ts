import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CreatePostComponent } from './pages/create-post/create-post.component';
import { PostDetailComponent } from './pages/post-detail/post-detail.component';

const routes: Routes = [
  { path: '', component: CreatePostComponent },
  { path: ':id', component: PostDetailComponent },
];

@NgModule({
  declarations: [CreatePostComponent, PostDetailComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class PostModule {}

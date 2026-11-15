import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NavbarComponent } from './components/navbar/navbar.component';
import { PostCardComponent } from './components/post-card/post-card.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { ToastComponent } from './components/toast/toast.component';
import { UserAvatarComponent } from './components/user-avatar/user-avatar.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { AuthMediaPipe } from './pipes/auth-media.pipe';
import { RelativeTimePipe } from './pipes/relative-time.pipe';

const SHARED_DECLARATIONS = [
  NavbarComponent,
  PostCardComponent,
  LoadingSpinnerComponent,
  EmptyStateComponent,
  ToastComponent,
  UserAvatarComponent,
  ConfirmModalComponent,
  AuthMediaPipe,
  RelativeTimePipe,
];

@NgModule({
  declarations: [...SHARED_DECLARATIONS],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  exports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ...SHARED_DECLARATIONS,
  ],
})
export class SharedModule {}

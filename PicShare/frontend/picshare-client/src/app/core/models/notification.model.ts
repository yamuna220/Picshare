import { User } from './user.model';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'follow_request'
  | 'follow_accept';

export interface AppNotification {
  id: string;
  type: NotificationType;
  actor: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
  postId?: string | null;
  postThumbnailUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

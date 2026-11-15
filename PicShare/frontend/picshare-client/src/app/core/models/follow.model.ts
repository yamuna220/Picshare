import { User } from './user.model';

export type FollowStatus = 'pending' | 'accepted';

export interface FollowRelation {
  id: string;
  follower: User;
  following: User;
  status: FollowStatus;
  createdAt: string;
}

export interface FollowRequestItem {
  id: string;
  requester: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
  createdAt: string;
}

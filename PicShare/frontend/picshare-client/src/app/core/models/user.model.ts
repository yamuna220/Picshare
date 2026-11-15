export interface User {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  bio: string;
  profilePicture: string;
  isPrivate: boolean;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  createdAt?: string;
}

export interface UserProfile extends User {
  followStatus?: 'none' | 'pending' | 'accepted';
  isFollowingViewer?: boolean;
  isOwnProfile?: boolean;
  canViewPosts?: boolean;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

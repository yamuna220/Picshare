export interface PostAuthor {
  id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  author: PostAuthor;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  author: PostAuthor;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isLikedByCurrentUser: boolean;
  comments?: PostComment[];
  createdAt: string;
}

export interface PaginatedPostsResponse {
  posts: Post[];
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
}

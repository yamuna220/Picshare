import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Post } from '../../../core/models/post.model';
import { ToastService } from '../../../core/services/toast.service';

const CAPTION_PREVIEW_LIMIT = 140;

@Component({
  selector: 'app-post-card',
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.css'],
})
export class PostCardComponent implements OnInit {
  @Input() post!: Post;
  @Input() currentUserId: string = '';
  @Input() defaultShowComments: boolean = false;

  @Output() toggleLike = new EventEmitter<string>();
  @Output() addComment = new EventEmitter<{ postId: string; text: string }>();
  @Output() deletePost = new EventEmitter<string>();

  commentDraft = '';
  showComments = false;
  captionExpanded = false;
  imageFailed = false;
  showDeleteModal = false;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    if (this.defaultShowComments) {
      this.showComments = true;
    }
  }

  get isOwner(): boolean {
    return Boolean(this.currentUserId && this.post?.author?.id === this.currentUserId);
  }

  get hasLongCaption(): boolean {
    return Boolean(this.post?.caption && this.post.caption.length > CAPTION_PREVIEW_LIMIT);
  }

  get displayedCaption(): string {
    const caption = this.post?.caption || '';
    if (!this.hasLongCaption || this.captionExpanded) {
      return caption;
    }
    return `${caption.slice(0, CAPTION_PREVIEW_LIMIT).trim()}...`;
  }

  onToggleLike(): void {
    this.toggleLike.emit(this.post.id);
  }

  onToggleComments(): void {
    this.showComments = !this.showComments;
  }

  onToggleCaption(): void {
    this.captionExpanded = !this.captionExpanded;
  }

  onSharePost(): void {
    const postUrl = `${window.location.origin}/posts/${this.post.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(postUrl)
        .then(() => {
          this.toastService.success('Post link copied to clipboard.');
        })
        .catch(() => {
          this.copyFallback(postUrl);
        });
      return;
    }
    this.copyFallback(postUrl);
  }

  private copyFallback(text: string): void {
    try {
      const input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      this.toastService.success('Post link copied to clipboard.');
    } catch {
      this.toastService.info(`Share link: /posts/${this.post.id}`);
    }
  }

  onSubmitComment(): void {
    const trimmed = this.commentDraft.trim();
    if (!trimmed) {
      return;
    }
    this.addComment.emit({ postId: this.post.id, text: trimmed });
    this.commentDraft = '';
    this.showComments = true;
  }

  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  confirmDeletePost(): void {
    this.showDeleteModal = false;
    this.deletePost.emit(this.post.id);
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}

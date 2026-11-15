import React, { useState } from 'react';
import {
  Home,
  Search,
  PlusSquare,
  UserPlus,
  Bell,
  User,
  Settings,
  LogIn,
  Image as ImageIcon,
  Lock,
  Check,
} from 'lucide-react';

type RouteKey =
  | 'feed'
  | 'search'
  | 'create'
  | 'requests'
  | 'notifications'
  | 'my-profile'
  | 'user-profile'
  | 'edit-profile'
  | 'followers'
  | 'following'
  | 'settings'
  | 'login'
  | 'register';

interface RouteOption {
  key: RouteKey;
  label: string;
  path: string;
}

const ALL_ROUTES: RouteOption[] = [
  { key: 'feed', label: 'Home Feed', path: '/' },
  { key: 'search', label: 'Search Users', path: '/search' },
  { key: 'create', label: 'Create Post', path: '/create' },
  { key: 'requests', label: 'Follow Requests', path: '/requests' },
  { key: 'notifications', label: 'Notifications', path: '/notifications' },
  { key: 'my-profile', label: 'My Profile', path: '/profile' },
  { key: 'edit-profile', label: 'Edit Profile', path: '/profile/edit' },
  { key: 'user-profile', label: 'User Profile', path: '/users/:username' },
  { key: 'followers', label: 'Followers', path: '/profile/followers' },
  { key: 'following', label: 'Following', path: '/profile/following' },
  { key: 'settings', label: 'Settings', path: '/settings' },
  { key: 'login', label: 'Login', path: '/login' },
  { key: 'register', label: 'Registration', path: '/register' },
];

export default function App() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>('feed');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setUploadError('Only JPG, JPEG, and PNG image files are supported.');
      setPreviewDataUrl(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image exceeds the 5 MB maximum upload size.');
      setPreviewDataUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreviewDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (activeRoute === 'login' || activeRoute === 'register') {
    const isRegister = activeRoute === 'register';
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[380px] space-y-3">
          <div className="bg-white border border-[#dbdbdb] rounded-lg px-8 py-9">
            <h1 className="brand-wordmark text-center text-[28px] font-bold tracking-tight text-zinc-900">
              PicShare
            </h1>
            <p className="mt-2 mb-6 text-center text-sm text-zinc-500">
              {isRegister
                ? 'Sign up to share photographs and follow friends.'
                : 'Sign in to see photos from people you follow.'}
            </p>

            <form
              className="space-y-3.5"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              {isRegister && (
                <div>
                  <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full h-[42px] px-3 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md focus:bg-white focus:outline-none focus:border-zinc-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  placeholder={isRegister ? 'Choose a unique username' : 'Enter your username'}
                  className="w-full h-[42px] px-3 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md focus:bg-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  placeholder={isRegister ? 'Minimum 6 characters' : 'Enter your password'}
                  className="w-full h-[42px] px-3 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md focus:bg-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              {isRegister && (
                <div>
                  <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter your password"
                    className="w-full h-[42px] px-3 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md focus:bg-white focus:outline-none focus:border-zinc-400"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full h-[40px] mt-2 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                {isRegister ? 'Create Account' : 'Login'}
              </button>
            </form>
          </div>

          <div className="bg-white border border-[#dbdbdb] rounded-lg px-6 py-4 text-center text-sm text-zinc-700">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setActiveRoute(isRegister ? 'login' : 'register')}
              className="text-[#0095f6] font-semibold hover:underline"
            >
              {isRegister ? 'Login' : 'Create Account'}
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setActiveRoute('feed')}
              className="text-xs text-zinc-500 hover:underline"
            >
              Return to Home Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#dbdbdb] px-4 flex items-center justify-between z-40">
        <button
          type="button"
          onClick={() => setActiveRoute('feed')}
          className="brand-wordmark text-xl font-bold tracking-tight"
        >
          PicShare
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveRoute('notifications')}
            aria-label="Notifications"
            className="w-10 h-10 flex items-center justify-center text-zinc-900"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveRoute('settings')}
            aria-label="Settings"
            className="w-10 h-10 flex items-center justify-center text-zinc-900"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop / Tablet Left Navigation Rail */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-[72px] lg:w-[244px] bg-white border-r border-[#dbdbdb] flex-col px-3 py-7 z-40">
        <div className="px-3 pb-6">
          <button
            type="button"
            onClick={() => setActiveRoute('feed')}
            className="brand-wordmark text-[22px] font-bold tracking-tight hidden lg:block whitespace-nowrap"
          >
            PicShare
          </button>
          <button
            type="button"
            onClick={() => setActiveRoute('feed')}
            className="brand-wordmark text-xl font-bold lg:hidden w-11 h-11 flex items-center justify-center"
            aria-label="PicShare Home"
          >
            P
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1.5" aria-label="Primary navigation">
          {[
            { key: 'feed' as RouteKey, label: 'Home', icon: Home },
            { key: 'search' as RouteKey, label: 'Search', icon: Search },
            { key: 'create' as RouteKey, label: 'Create', icon: PlusSquare },
            { key: 'requests' as RouteKey, label: 'Requests', icon: UserPlus },
            { key: 'notifications' as RouteKey, label: 'Notifications', icon: Bell },
            { key: 'my-profile' as RouteKey, label: 'Profile', icon: User },
            { key: 'settings' as RouteKey, label: 'Settings', icon: Settings },
          ].map(({ key, label, icon: Icon }) => {
            const isActive = activeRoute === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveRoute(key)}
                className={`flex items-center justify-center lg:justify-start gap-3.5 px-3 py-2.5 rounded-lg text-[15px] transition-colors whitespace-nowrap ${
                  isActive
                    ? 'font-bold text-zinc-900 bg-zinc-100/80'
                    : 'font-normal text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-[22px] h-[22px] shrink-0" strokeWidth={isActive ? 2.3 : 1.8} />
                <span className="hidden lg:inline">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-[#efefef]">
          <button
            type="button"
            onClick={() => setActiveRoute('login')}
            className="w-full flex items-center justify-center lg:justify-start gap-3.5 px-3 py-2.5 rounded-lg text-[15px] text-zinc-800 hover:bg-zinc-100 transition-colors whitespace-nowrap"
          >
            <LogIn className="w-[22px] h-[22px] shrink-0" strokeWidth={1.8} />
            <span className="hidden lg:inline">Sign in</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-[72px] lg:ml-[244px] pt-14 pb-16 md:pt-0 md:pb-0 min-h-screen">
        {/* Stage 1 Route Switcher Strip */}
        <div className="border-b border-[#efefef] bg-white px-5 py-3">
          <div className="max-w-[935px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-zinc-500">
              PicShare Stage 1 Architecture &middot; 13 Angular 11 Routes
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ROUTES.map((route) => (
                <button
                  key={route.key}
                  type="button"
                  onClick={() => setActiveRoute(route.key)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap ${
                    activeRoute === route.key
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-700 border-[#dbdbdb] hover:bg-zinc-50'
                  }`}
                >
                  {route.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-[935px] mx-auto px-4 md:px-5 py-6 md:py-8">
          {activeRoute === 'feed' && (
            <div className="max-w-[640px] mx-auto">
              <div className="flex items-center justify-between gap-4 pb-4 mb-6 border-b border-[#efefef]">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Home Feed</h1>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Newest photographs from people you follow and your own posts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRoute('create')}
                  className="h-10 px-4 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold whitespace-nowrap shrink-0"
                >
                  Create Post
                </button>
              </div>

              <div className="bg-white border border-[#dbdbdb] rounded-lg px-6 py-12 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border border-[#dbdbdb] flex items-center justify-center mb-4 text-zinc-800">
                  <ImageIcon className="w-6 h-6" strokeWidth={1.6} />
                </div>
                <h2 className="text-lg font-bold mb-2">Your feed is empty</h2>
                <p className="text-sm text-zinc-500 max-w-sm mb-5">
                  Follow creators or publish your first photograph once Stage 2 feed endpoints are connected.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveRoute('search')}
                  className="h-10 px-5 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold whitespace-nowrap"
                >
                  Search Users
                </button>
              </div>
            </div>
          )}

          {activeRoute === 'search' && (
            <div className="max-w-[640px] mx-auto">
              <div className="pb-4 mb-6 border-b border-[#efefef]">
                <h1 className="text-xl font-bold tracking-tight">Search Users</h1>
                <p className="text-sm text-zinc-500 mt-0.5">Find creators by username.</p>
              </div>
              <form
                className="flex gap-2.5 mb-5"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by username..."
                  className="flex-1 h-[42px] px-3 text-sm bg-white border border-[#dbdbdb] rounded-md focus:outline-none focus:border-zinc-400"
                />
                <button
                  type="submit"
                  disabled={!searchInput.trim()}
                  className="h-[42px] px-5 rounded-lg bg-[#0095f6] disabled:opacity-50 text-white text-sm font-semibold whitespace-nowrap"
                >
                  Search
                </button>
              </form>
              <div className="bg-white border border-[#dbdbdb] rounded-lg px-6 py-12 text-center flex flex-col items-center">
                <h2 className="text-lg font-bold mb-1.5">Discover people on PicShare</h2>
                <p className="text-sm text-zinc-500 max-w-sm">
                  Enter a username above to find profiles once user search APIs are wired in Stage 2.
                </p>
              </div>
            </div>
          )}

          {activeRoute === 'create' && (
            <div className="max-w-[780px] mx-auto">
              <div className="pb-4 mb-6 border-b border-[#efefef]">
                <h1 className="text-xl font-bold tracking-tight">Create Post</h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Upload a JPG, JPEG, or PNG photograph up to 5 MB.
                </p>
              </div>

              <div className="bg-white border border-[#dbdbdb] rounded-lg p-6">
                {uploadError && (
                  <div className="mb-4 px-3.5 py-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {uploadError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="aspect-square rounded-lg border border-dashed border-[#dbdbdb] bg-[#fafafa] flex items-center justify-center overflow-hidden">
                    {previewDataUrl ? (
                      <img
                        src={previewDataUrl}
                        alt="Selected preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center px-6">
                        <ImageIcon className="w-9 h-9 mx-auto text-zinc-400 mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-semibold text-zinc-900">
                          Select a photograph from your device
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">JPG, JPEG, PNG &middot; Max 5 MB</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5">
                      <label className="h-10 px-4 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-[#dbdbdb] text-sm font-semibold inline-flex items-center cursor-pointer whitespace-nowrap">
                        {previewDataUrl ? 'Change Photo' : 'Choose Photo'}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                          className="sr-only"
                          onChange={handlePhotoSelect}
                        />
                      </label>
                      {previewDataUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewDataUrl(null)}
                          className="h-10 px-4 rounded-lg bg-white border border-[#dbdbdb] text-[#ed4956] text-sm font-semibold hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">
                        Caption
                      </label>
                      <textarea
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        maxLength={2200}
                        placeholder="Write a caption..."
                        className="w-full min-h-[112px] px-3 py-2.5 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md focus:bg-white focus:outline-none focus:border-zinc-400"
                      />
                      <div className="text-right text-xs text-zinc-500 mt-1 tabular-nums">
                        {captionDraft.length} / 2200
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!previewDataUrl}
                      className="w-full h-10 rounded-lg bg-[#0095f6] disabled:opacity-50 text-white text-sm font-semibold"
                    >
                      Create Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeRoute === 'my-profile' || activeRoute === 'user-profile') && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 md:gap-9 items-center pb-8">
                <div className="flex md:justify-center">
                  <div className="w-28 h-28 rounded-full bg-zinc-100 border border-[#dbdbdb] flex items-center justify-center text-2xl font-bold text-zinc-500">
                    PS
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <h1 className="text-[22px] font-semibold tracking-tight">
                      {activeRoute === 'my-profile' ? 'Your Profile' : 'User Profile'}
                    </h1>
                    {activeRoute === 'my-profile' ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveRoute('edit-profile')}
                          className="h-9 px-4 rounded-lg bg-zinc-100 border border-[#dbdbdb] text-sm font-semibold"
                        >
                          Edit profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRoute('settings')}
                          className="h-9 px-4 rounded-lg bg-zinc-100 border border-[#dbdbdb] text-sm font-semibold"
                        >
                          Settings
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="h-9 px-5 rounded-lg bg-[#0095f6] text-white text-sm font-semibold"
                      >
                        Follow
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-7 text-[15px] tabular-nums">
                    <div>
                      <strong>0</strong> posts
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveRoute('followers')}
                      className="hover:underline"
                    >
                      <strong>0</strong> followers
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRoute('following')}
                      className="hover:underline"
                    >
                      <strong>0</strong> following
                    </button>
                  </div>

                  <p className="text-xs text-zinc-500">
                    {activeRoute === 'my-profile'
                      ? 'Sign in or register once Stage 2 endpoints are connected to populate your profile.'
                      : 'Public and private account visibility rules are enforced by the backend authorization middleware.'}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#dbdbdb] flex justify-center mb-5">
                <span className="py-3 px-1 border-t border-zinc-900 -mt-px text-xs font-semibold tracking-wider uppercase">
                  Posts
                </span>
              </div>

              {activeRoute === 'user-profile' ? (
                <div className="bg-white border border-[#dbdbdb] rounded-lg px-6 py-10 text-center">
                  <Lock className="w-6 h-6 mx-auto text-zinc-700 mb-2" strokeWidth={1.6} />
                  <h2 className="text-base font-bold">Profile posts load from MongoDB</h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Private account posts remain hidden unless the viewer is an approved follower.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-[#dbdbdb] rounded-lg px-6 py-12 text-center">
                  <h2 className="text-lg font-bold mb-1.5">Share Photos</h2>
                  <p className="text-sm text-zinc-500 mb-5">
                    When you share photographs, they will appear on your profile grid.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveRoute('create')}
                    className="h-10 px-5 rounded-lg bg-[#0095f6] text-white text-sm font-semibold"
                  >
                    Create your first post
                  </button>
                </div>
              )}
            </div>
          )}

          {activeRoute === 'edit-profile' && (
            <div className="max-w-[640px] mx-auto">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#efefef]">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Edit Profile</h1>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Update your photo, display name, bio, and privacy setting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRoute('my-profile')}
                  className="h-9 px-4 rounded-lg bg-zinc-100 border border-[#dbdbdb] text-sm font-semibold"
                >
                  Back to Profile
                </button>
              </div>

              <div className="bg-white border border-[#dbdbdb] rounded-lg p-6 space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold mb-1.5">Display Name</label>
                  <input
                    type="text"
                    placeholder="Your display name"
                    className="w-full h-[42px] px-3 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-1.5">Bio</label>
                  <textarea
                    placeholder="Write a short bio..."
                    className="w-full min-h-[92px] px-3 py-2 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md"
                  />
                </div>
                <label className="flex items-start gap-3 p-3.5 border border-[#dbdbdb] rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivateAccount}
                    onChange={(e) => setIsPrivateAccount(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <span className="block text-sm font-semibold">Private account</span>
                    <span className="block text-xs text-zinc-500">
                      Only approved followers can view your photographs.
                    </span>
                  </div>
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="h-10 px-5 rounded-lg bg-[#0095f6] text-white text-sm font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {(activeRoute === 'followers' ||
            activeRoute === 'following' ||
            activeRoute === 'requests' ||
            activeRoute === 'notifications') && (
            <div className="max-w-[640px] mx-auto">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#efefef]">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    {activeRoute === 'followers'
                      ? 'Followers'
                      : activeRoute === 'following'
                      ? 'Following'
                      : activeRoute === 'requests'
                      ? 'Follow Requests'
                      : 'Notifications'}
                  </h1>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {activeRoute === 'requests'
                      ? 'Approve or decline requests for your private account.'
                      : activeRoute === 'notifications'
                      ? 'Activity on your photographs and follow updates.'
                      : 'Manage your social connections.'}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#dbdbdb] rounded-lg px-6 py-12 text-center">
                <h2 className="text-lg font-bold mb-1.5">
                  {activeRoute === 'requests'
                    ? 'No pending follow requests'
                    : activeRoute === 'notifications'
                    ? 'No notifications yet'
                    : activeRoute === 'followers'
                    ? 'No followers yet'
                    : 'Not following anyone yet'}
                </h2>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                  Live records from MongoDB will populate this view once Stage 2 social and notification APIs are implemented.
                </p>
              </div>
            </div>
          )}

          {activeRoute === 'settings' && (
            <div className="max-w-[640px] mx-auto space-y-4">
              <div className="pb-4 mb-2 border-b border-[#efefef]">
                <h1 className="text-xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Manage your profile, security, privacy, and session.
                </p>
              </div>

              <div className="bg-white border border-[#dbdbdb] rounded-lg p-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold">Edit Profile</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Update your profile photo, display name, and bio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRoute('edit-profile')}
                  className="h-9 px-4 rounded-lg bg-zinc-100 border border-[#dbdbdb] text-sm font-semibold whitespace-nowrap"
                >
                  Edit Profile
                </button>
              </div>

              <div className="bg-white border border-[#dbdbdb] rounded-lg p-5">
                <h2 className="text-base font-bold">Account Privacy</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  When your account is private, only approved followers can see your photographs.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPrivateAccount((v) => !v)}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900"
                >
                  <span
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      isPrivateAccount
                        ? 'bg-[#0095f6] border-[#0095f6] text-white'
                        : 'bg-white border-[#dbdbdb]'
                    }`}
                  >
                    {isPrivateAccount && <Check className="w-3.5 h-3.5" />}
                  </span>
                  Private account
                </button>
              </div>

              <div className="bg-white border border-[#dbdbdb] rounded-lg p-5 space-y-3">
                <h2 className="text-base font-bold">Change Password</h2>
                <input
                  type="password"
                  placeholder="Current password"
                  className="w-full h-[40px] px-3 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md"
                />
                <input
                  type="password"
                  placeholder="New password"
                  className="w-full h-[40px] px-3 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full h-[40px] px-3 text-sm bg-[#fafafa] border border-[#dbdbdb] rounded-md"
                />
                <button
                  type="button"
                  className="h-10 px-4 rounded-lg bg-[#0095f6] text-white text-sm font-semibold"
                >
                  Update Password
                </button>
              </div>

              <div className="bg-white border border-[#dbdbdb] rounded-lg p-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#ed4956]">Delete Account</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Permanently remove your account and all uploaded media.
                  </p>
                </div>
                <button
                  type="button"
                  className="h-9 px-4 rounded-lg border border-[#dbdbdb] text-[#ed4956] text-sm font-semibold hover:bg-red-50 whitespace-nowrap"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-[#dbdbdb] flex items-center justify-around z-40"
        aria-label="Mobile navigation"
      >
        {[
          { key: 'feed' as RouteKey, label: 'Home', icon: Home },
          { key: 'search' as RouteKey, label: 'Search', icon: Search },
          { key: 'create' as RouteKey, label: 'Create', icon: PlusSquare },
          { key: 'requests' as RouteKey, label: 'Requests', icon: UserPlus },
          { key: 'my-profile' as RouteKey, label: 'Profile', icon: User },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveRoute(key)}
            aria-label={label}
            className="w-11 h-11 flex items-center justify-center text-zinc-900"
          >
            <Icon className="w-6 h-6" strokeWidth={activeRoute === key ? 2.4 : 1.8} />
          </button>
        ))}
      </nav>
    </div>
  );
}

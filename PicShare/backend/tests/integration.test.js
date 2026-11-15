const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const app = require('../app');
const { User, Post } = require('../models');
const env = require('../config/env');

// Minimal valid 1x1 PNG bytes
const SAMPLE_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const createdFiles = [];

const cleanupFiles = () => {
  createdFiles.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};

async function runTests() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });

  try {
    console.log('1. Testing Registration...');
    // Reject mismatched password
    const badReg = await request(app).post('/api/auth/register').send({
      email: 'alice@example.com',
      username: 'alice_dev',
      password: 'password123',
      confirmPassword: 'differentPassword',
    });
    assert.strictEqual(badReg.status, 400, 'Expected 400 on password mismatch');

    // Valid registration
    const regRes = await request(app).post('/api/auth/register').send({
      email: 'alice@example.com',
      username: 'alice_dev',
      password: 'password123',
      confirmPassword: 'password123',
    });
    assert.strictEqual(regRes.status, 201, 'Expected 201 on valid registration');
    assert.strictEqual(regRes.body.success, true);
    assert.strictEqual(regRes.body.data.user.username, 'alice_dev');

    // Verify duplicate email and username rejected
    const dupEmailRes = await request(app).post('/api/auth/register').send({
      email: 'alice@example.com',
      username: 'alice_other',
      password: 'password123',
      confirmPassword: 'password123',
    });
    assert.strictEqual(dupEmailRes.status, 409, 'Expected 409 on duplicate email');

    const dupUserRes = await request(app).post('/api/auth/register').send({
      email: 'alice2@example.com',
      username: 'alice_dev',
      password: 'password123',
      confirmPassword: 'password123',
    });
    assert.strictEqual(dupUserRes.status, 409, 'Expected 409 on duplicate username');

    // Verify user saved in MongoDB with bcrypt hash
    const dbUser = await User.findOne({ username: 'alice_dev' }).select('+password');
    assert.ok(dbUser, 'User record should exist in MongoDB');
    assert.notStrictEqual(dbUser.password, 'password123', 'Password must be bcrypt-hashed');
    assert.ok(dbUser.password.startsWith('$2'), 'Password hash must be bcrypt format');
    console.log('   -> Registration & MongoDB User persistence passed');

    console.log('2. Testing Login & Protected Route Guard...');
    const badLogin = await request(app).post('/api/auth/login').send({
      username: 'alice_dev',
      password: 'wrongpassword',
    });
    assert.strictEqual(badLogin.status, 401, 'Expected 401 for invalid password');

    const unauthMe = await request(app).get('/api/users/me');
    assert.strictEqual(unauthMe.status, 401, 'Expected 401 on unauthenticated /users/me');

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'alice_dev',
      password: 'password123',
    });
    assert.strictEqual(loginRes.status, 200, 'Expected 200 on valid login');
    assert.ok(loginRes.body.data.token, 'JWT token should be returned');
    const aliceToken = loginRes.body.data.token;
    console.log('   -> Login & JWT auth passed');

    console.log('3. Testing Profile Picture Upload (Multer -> uploads/profiles)...');
    const badFileRes = await request(app)
      .put('/api/users/me/profile-picture')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('profilePicture', Buffer.from('not an image'), 'notes.txt');
    assert.strictEqual(badFileRes.status, 400, 'Expected 400 for non-image file');

    const avatarRes = await request(app)
      .put('/api/users/me/profile-picture')
      .set('Authorization', `Bearer ${aliceToken}`)
      .attach('profilePicture', SAMPLE_PNG_BUFFER, 'avatar.png');
    assert.strictEqual(avatarRes.status, 200, 'Expected 200 on valid profile picture upload');
    assert.ok(
      avatarRes.body.data.profilePicture.includes('/api/media/profiles/'),
      'Response should contain /api/media/profiles/ URL'
    );

    const updatedDbUser = await User.findById(dbUser._id);
    assert.ok(updatedDbUser.profilePicture, 'MongoDB user.profilePicture must be populated');
    const profileDiskPath = path.join(env.UPLOAD_ROOT, 'profiles', updatedDbUser.profilePicture);
    createdFiles.push(profileDiskPath);
    assert.ok(fs.existsSync(profileDiskPath), 'Uploaded file must exist in uploads/profiles/');

    const fetchAvatarRes = await request(app).get(
      `/api/media/profiles/${updatedDbUser.profilePicture}`
    );
    assert.strictEqual(fetchAvatarRes.status, 200, 'Profile picture media endpoint should serve 200');
    console.log('   -> Profile picture upload, MongoDB update & uploads/profiles storage passed');

    console.log('4. Testing Create Post, Feed, Profile Grid & Privacy Protection...');
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${aliceToken}`)
      .field('caption', 'First sunset capture on PicShare')
      .attach('image', SAMPLE_PNG_BUFFER, 'sunset.png');

    assert.strictEqual(postRes.status, 201, 'Expected 201 on post creation');
    assert.strictEqual(postRes.body.data.caption, 'First sunset capture on PicShare');
    assert.ok(postRes.body.data.imageUrl.includes('/api/media/posts/'));

    const dbPost = await Post.findById(postRes.body.data.id);
    assert.ok(dbPost, 'Post record must exist in MongoDB');
    assert.strictEqual(dbPost.author.toString(), dbUser._id.toString());
    const postDiskPath = path.join(env.UPLOAD_ROOT, 'posts', dbPost.imagePath);
    createdFiles.push(postDiskPath);
    assert.ok(fs.existsSync(postDiskPath), 'Post image must exist in uploads/posts/');

    const userAfterPost = await User.findById(dbUser._id);
    assert.strictEqual(userAfterPost.postsCount, 1, 'User postsCount should increment to 1');

    const feedRes = await request(app)
      .get('/api/posts/feed')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(feedRes.status, 200);
    assert.strictEqual(feedRes.body.data.posts.length, 1, 'Feed should contain newly created post');

    const myProfileRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(myProfileRes.status, 200);
    assert.strictEqual(myProfileRes.body.data.posts.length, 1, 'Profile should contain newly created post');

    // Privacy check on post media
    await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ isPrivate: true });

    await request(app).post('/api/auth/register').send({
      email: 'bob@example.com',
      username: 'bob_viewer',
      password: 'password123',
      confirmPassword: 'password123',
    });
    const bobLogin = await request(app).post('/api/auth/login').send({
      username: 'bob_viewer',
      password: 'password123',
    });
    const bobToken = bobLogin.body.data.token;

    const unauthMedia = await request(app).get(`/api/media/posts/${dbPost.imagePath}`);
    assert.strictEqual(unauthMedia.status, 401, 'Unauthenticated access to private post media must fail with 401');

    const nonFollowerMedia = await request(app)
      .get(`/api/media/posts/${dbPost.imagePath}`)
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(nonFollowerMedia.status, 403, 'Non-follower access to private post media must fail with 403');

    const bobExploreBefore = await request(app)
      .get('/api/posts/explore')
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(bobExploreBefore.status, 200);
    assert.strictEqual(
      bobExploreBefore.body.data.posts.some((p) => p.id === postRes.body.data.id),
      false,
      'Explore must exclude private user posts for non-followers'
    );

    const ownerMedia = await request(app)
      .get(`/api/media/posts/${dbPost.imagePath}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(ownerMedia.status, 200, 'Owner access to private post media must succeed with 200');
    console.log('   -> Create post, feed, profile grid & private media protection passed');

    console.log('5. Testing Private Follow Requests, Accept/Reject Authorization & Follow Back...');
    // Bob cannot read Alice's private followers/following yet
    const blockedFollowers = await request(app)
      .get('/api/follows/alice_dev/followers')
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(blockedFollowers.status, 403, 'Expected 403 for non-follower viewing private followers');

    // Bob requests to follow private Alice
    const bobUser = await User.findOne({ username: 'bob_viewer' });
    const reqFollowRes = await request(app)
      .post(`/api/follows/${dbUser._id}`)
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(reqFollowRes.status, 201);
    assert.strictEqual(reqFollowRes.body.data.followStatus, 'pending');

    // Bob cannot see Alice's pending requests (only owner sees own requests)
    const bobRequestsRes = await request(app)
      .get('/api/follows/requests')
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(bobRequestsRes.status, 200);
    assert.strictEqual(bobRequestsRes.body.data.length, 0, 'Bob must not see Alice incoming requests');

    // Alice sees Bob's pending request
    const aliceRequestsRes = await request(app)
      .get('/api/follows/requests')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(aliceRequestsRes.status, 200);
    assert.strictEqual(aliceRequestsRes.body.data.length, 1);
    const requestId = aliceRequestsRes.body.data[0].id;

    // Unauthorized user (Bob) cannot accept Alice's incoming request
    const unauthAccept = await request(app)
      .post(`/api/follows/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(unauthAccept.status, 403, 'Expected 403 when non-owner tries to accept follow request');

    // Alice accepts Bob's request
    const acceptRes = await request(app)
      .post(`/api/follows/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.body.data.followersCount, 1);

    // Alice checks Bob's profile -> sees isFollowingViewer: true (Follow back)
    const aliceViewsBob = await request(app)
      .get('/api/users/bob_viewer')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(aliceViewsBob.status, 200);
    assert.strictEqual(aliceViewsBob.body.data.user.isFollowingViewer, true);
    assert.strictEqual(aliceViewsBob.body.data.user.followStatus, 'none');

    // Alice follows Bob back (Bob is public -> accepted immediately)
    const followBackRes = await request(app)
      .post(`/api/follows/${bobUser._id}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(followBackRes.status, 201);
    assert.strictEqual(followBackRes.body.data.followStatus, 'accepted');
    console.log('   -> Follow requests, authorization & follow back passed');

    console.log('6. Testing Followers/Following Lists, Explore, Post Detail, Likes & Comments...');
    const bobExploreAfter = await request(app)
      .get('/api/posts/explore')
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(bobExploreAfter.status, 200);
    assert.strictEqual(
      bobExploreAfter.body.data.posts.some((p) => p.id === postRes.body.data.id),
      true,
      'Explore must include followed private user posts'
    );

    const followersList = await request(app)
      .get('/api/follows/alice_dev/followers')
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(followersList.status, 200);
    assert.strictEqual(followersList.body.data.length, 1);
    assert.strictEqual(followersList.body.data[0].username, 'bob_viewer');

    const likeRes = await request(app)
      .post(`/api/posts/${dbPost._id}/like`)
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(likeRes.status, 200);
    assert.strictEqual(likeRes.body.data.likesCount, 1);

    const commentRes = await request(app)
      .post(`/api/posts/${dbPost._id}/comments`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ text: 'Great composition!' });
    assert.strictEqual(commentRes.status, 201);

    const postDetailRes = await request(app)
      .get(`/api/posts/${dbPost._id}`)
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(postDetailRes.status, 200);
    assert.strictEqual(postDetailRes.body.data.comments.length, 1);
    console.log('   -> Followers list, explore, post detail, likes & comments passed');

    console.log('7. Testing Notifications, Unread Count & Mark Read...');
    const aliceNotifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(aliceNotifRes.status, 200);
    const aliceTypes = aliceNotifRes.body.data.map((n) => n.type);
    assert.ok(aliceTypes.includes('like'), 'Expected like notification');
    assert.ok(aliceTypes.includes('comment'), 'Expected comment notification');

    const unreadId = aliceNotifRes.body.data.find((n) => !n.isRead).id;
    const markOneRes = await request(app)
      .patch(`/api/notifications/${unreadId}/read`)
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(markOneRes.status, 200);
    assert.strictEqual(markOneRes.body.data.notification.isRead, true);

    const markAllRes = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(markAllRes.status, 200);
    assert.strictEqual(markAllRes.body.data.unreadCount, 0);

    // Bob should have follow_accept and follow notifications
    const bobNotifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${bobToken}`);
    assert.strictEqual(bobNotifRes.status, 200);
    const bobTypes = bobNotifRes.body.data.map((n) => n.type);
    assert.ok(bobTypes.includes('follow_accept'), 'Expected follow_accept notification');
    assert.ok(bobTypes.includes('follow'), 'Expected follow notification');
    console.log('   -> Notifications, unread counts & mark read passed');

    console.log('8. Testing Settings (Privacy, Change Password, Remove Follower, Delete Account)...');
    const pwRes = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'newPassword456',
        confirmNewPassword: 'newPassword456',
      });
    assert.strictEqual(pwRes.status, 200);

    const bobRelogin = await request(app).post('/api/auth/login').send({
      username: 'bob_viewer',
      password: 'newPassword456',
    });
    assert.strictEqual(bobRelogin.status, 200, 'Login with updated password must succeed');
    const bobNewToken = bobRelogin.body.data.token;

    // Wrong password on delete account must fail with 400
    const badDelete = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${bobNewToken}`)
      .send({ password: 'wrongpassword' });
    assert.strictEqual(badDelete.status, 400);

    // Correct password deletes Bob and cleans up Alice's follower/comment/like counts
    const delRes = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${bobNewToken}`)
      .send({ password: 'newPassword456' });
    assert.strictEqual(delRes.status, 200);

    const deletedBob = await User.findById(bobUser._id);
    assert.strictEqual(deletedBob, null, 'Deleted user must be removed from MongoDB');
    const refreshedAlicePost = await Post.findById(dbPost._id);
    assert.strictEqual(refreshedAlicePost.likesCount, 0, 'Likes count must decrement when liker deletes account');
    assert.strictEqual(refreshedAlicePost.commentsCount, 0, 'Comments count must decrement when commenter deletes account');
    const refreshedAlice = await User.findById(dbUser._id);
    assert.strictEqual(refreshedAlice.followersCount, 0, 'Followers count must decrement when follower deletes account');
    console.log('   -> Settings (privacy, change password, delete account cascade) passed');

    console.log('\nALL BACKEND & MONGODB INTEGRATION TESTS PASSED');
  } finally {
    cleanupFiles();
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runTests().catch((err) => {
  cleanupFiles();
  console.error('Integration test failed:', err);
  process.exit(1);
});

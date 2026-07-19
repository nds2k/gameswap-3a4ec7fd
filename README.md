# GameSwapp - Rebuilt from Zero

**Status:** Week 1-2 Complete (Foundation + Hooks)  
**Stack:** React 18 + TypeScript + Vite + Supabase + TailwindCSS  
**Goal:** Clean, bug-free codebase. No schema confusion. Type-safe everything.

---

## 📂 Architecture

```
src/
├── types/
│   └── index.ts                 # 30+ interfaces (Profile, Game, Message, etc.)
├── services/
│   ├── auth.ts                  # signUp, signIn, signOut, getCurrentUser
│   ├── profiles.ts              # getProfile, updateProfile, searchProfiles
│   ├── games.ts                 # CRUD games, search, boost, images
│   ├── forum.ts                 # Posts, replies, likes
│   ├── messages.ts              # 1-on-1 & group chats, realtime
│   ├── friends.ts               # Send/accept/reject/block
│   ├── wishlist.ts              # Add/remove games
│   ├── seller.ts                # Seller profiles, ratings, stats
│   └── index.ts                 # Barrel export
├── hooks/
│   ├── useAuth.ts               # Auth state + methods
│   ├── useGames.ts              # Game CRUD + state
│   ├── useForum.ts              # Forum posts + replies + state
│   ├── useMessages.ts           # Conversations + messages + realtime
│   ├── useFriends.ts            # Friends + requests + state
│   ├── useWishlist.ts           # Wishlist + state
│   ├── useProfile.ts            # Profile management + state
│   ├── useSeller.ts             # Seller management + state
│   └── index.ts                 # Barrel export
├── contexts/
│   └── AuthContext.tsx          # App-wide auth state (AuthProvider + useAuthContext)
├── pages/                       # (Keep existing UI)
├── components/                  # (Keep existing UI)
└── integrations/
    └── supabase.ts              # Supabase client initialization
```

---

## 🗄️ Database Schema

**14 tables, clean design, zero ambiguity:**

### Core
- `profiles` — User profiles (user_id FK to auth.users)
- `games` — Game listings (user_id owner, status, location)
- `game_images` — Images per game (display_order)

### Wishlist & Friends
- `wishlist` — User game wishlists
- `friendships` — Friend relationships (status: pending/accepted/blocked)

### Messaging
- `conversations` — 1-on-1 or group chats (type, name, created_by_id)
- `conversation_participants` — Who's in each conversation
- `messages` — Messages with read status (sender_id, is_read)

### Forum
- `forum_posts` — Discussion posts (author_id FK to auth.users)
- `forum_replies` — Post replies (author_id)
- `forum_likes` — Post likes

### Seller
- `seller_info` — Seller profiles (verification_status, avg_rating, bio)
- `ratings` — User ratings/reviews (rater_id, rated_id, rating 1-5)

**Key Design:**
- Single FK strategy: `user_id` for ownership, `author_id` for content
- RLS on every table (users can only read/write own data + public data)
- Indexes on all frequently-queried columns
- Cascade deletes prevent orphan data

---

## 🚀 Services Layer (70+ functions)

Each service = one domain. No god services. Type-safe returns.

### Auth
```typescript
signUp(email, password, fullName) -> User with profile auto-created
signIn(email, password) -> Session
signOut() -> void
getCurrentUser() -> AuthUser | null
onAuthStateChange(callback) -> Unsubscribe function
resetPassword(email) -> void
updatePassword(newPassword) -> void
```

### Profiles
```typescript
getProfileByUserId(userId) -> Profile | null
getProfileByUsername(username) -> Profile | null
searchProfiles(query, limit) -> Profile[]
updateProfile(userId, updates) -> Profile | null
getSellersNearby(lat, lng, radiusKm) -> Profile[]  // Haversine formula
getUserRatings(userId) -> Rating[]
getAverageRating(userId) -> number | null
```

### Games
```typescript
createGame(userId, gameData) -> Game | null
getGameById(gameId) -> GameWithImages | null  // Includes images + owner
getUserGames(userId) -> Game[]
searchGames(filters) -> PaginatedResponse<GameWithImages>
  // Filters: search, platform, condition, price, status, nearby, sortBy
updateGame(gameId, userId, updates) -> Game | null
deleteGame(gameId, userId) -> boolean
uploadGameImage(gameId, file) -> imageUrl
addGameImage(gameId, imageUrl, displayOrder) -> GameImage | null
deleteGameImage(imageId) -> boolean
boostGame(gameId, userId) -> Game | null
```

### Forum
```typescript
createForumPost(authorId, title, content, category) -> ForumPost | null
getForumPost(postId, userId?) -> ForumPostWithAuthor | null
searchForumPosts(filters, userId?) -> PaginatedResponse<ForumPostWithAuthor>
  // Categories: general, questions, trades, reviews, guides, announcements
updateForumPost(postId, authorId, title, content) -> ForumPost | null
deleteForumPost(postId, authorId) -> boolean
createForumReply(postId, authorId, content) -> ForumReply | null
getForumReplies(postId) -> ForumReplyWithAuthor[]
updateForumReply(replyId, authorId, content) -> ForumReply | null
deleteForumReply(replyId, authorId) -> boolean
likeForumPost(postId, userId) -> boolean
unlikeForumPost(postId, userId) -> boolean
```

### Messaging
```typescript
getOrCreateOneOnOne(userId, recipientId) -> Conversation | null
createGroupConversation(createdById, name, participantIds) -> Conversation | null
getUserConversations(userId) -> ConversationWithParticipants[]
  // Auto-calculates unread_count and last_message
getConversation(conversationId, limit?) -> ConversationWithParticipants | null
sendMessage(conversationId, senderId, content) -> Message | null
  // Auto-updates conversation.updated_at
getConversationMessages(conversationId, offset, limit) -> MessageWithSender[]
markMessageAsRead(messageId) -> boolean
markConversationAsRead(conversationId, userId) -> boolean
  // Marks all messages from others as read
addConversationParticipants(conversationId, participantIds) -> boolean
removeConversationParticipant(conversationId, userId) -> boolean
updateConversationName(conversationId, name) -> Conversation | null
subscribeToMessages(conversationId, callback) -> Unsubscribe
  // Realtime via Supabase
```

### Friends
```typescript
sendFriendRequest(fromUserId, toUserId) -> Friendship | null
acceptFriendRequest(friendshipId, userId) -> Friendship | null
  // Auto-creates reverse friendship
rejectFriendRequest(friendshipId, userId) -> boolean
removeFriend(userId, friendId) -> boolean
  // Removes both directions
getUserFriends(userId) -> FriendshipWithProfile[]
getPendingFriendRequests(userId) -> FriendshipWithProfile[]
  // Requests received
getSentFriendRequests(userId) -> FriendshipWithProfile[]
  // Requests sent
checkFriendshipStatus(userId, targetUserId) 
  -> 'none' | 'pending-sent' | 'pending-received' | 'friends'
blockUser(userId, blockedUserId) -> boolean
unblockUser(userId, blockedUserId) -> boolean
getBlockedUsers(userId) -> FriendshipWithProfile[]
```

### Wishlist
```typescript
addToWishlist(userId, gameId) -> boolean
removeFromWishlist(userId, gameId) -> boolean
getUserWishlist(userId) -> WishlistItemWithGame[]
isGameInWishlist(userId, gameId) -> boolean
getWishlistCount(userId) -> number
getGameWishlistUsers(gameId) -> any[]
```

### Seller
```typescript
createSellerProfile(userId, bio?) -> SellerInfo | null
getSellerProfile(userId) -> SellerInfo | null
updateSellerProfile(userId, updates) -> SellerInfo | null
getVerifiedSellers(limit) -> SellerInfo[]
  // Sorted by avg_rating
rateUser(raterId, ratedId, rating, comment?) -> Rating | null
  // Auto-updates seller.avg_rating
getUserRatings(userId) -> RatingWithRater[]
getUserRating(raterId, ratedId) -> Rating | null
getAverageUserRating(userId) -> number | null
getSellerStats(userId) -> { totalSales, avgRating, ratingsCount }
```

---

## 🎣 Hooks (8 custom hooks)

Each hook wraps services + manages local state + handles errors.

```typescript
const { user, loading, error, signUp, signIn, signOut, isAuthenticated } = useAuth();
const { games, currentGame, userGames, loading, error, searchGames, ... } = useGames();
const { posts, currentPost, replies, loading, error, createPost, ... } = useForum();
const { conversations, currentConversation, messages, loading, error, sendMessage, ... } = useMessages();
const { friends, pendingRequests, sentRequests, loading, error, sendRequest, ... } = useFriends();
const { wishlist, count, loading, error, addToWishlist, ... } = useWishlist();
const { profile, profiles, sellers, loading, error, updateProfile, ... } = useProfile();
const { sellerProfile, sellers, ratings, loading, error, rateUser, ... } = useSeller();
```

---

## 🔐 Auth Context

App-wide auth state. Wrap root component with `<AuthProvider>`.

```typescript
const { user, loading, isAuthenticated, signUp, signIn, signOut } = useAuthContext();
```

---

## 🛠️ Setup

1. **Copy schema to Supabase:**
   ```bash
   # In Supabase SQL editor, paste supabase/migrations/001_initial_schema.sql
   ```

2. **Environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Fill in:
   # VITE_SUPABASE_URL=https://your-project.supabase.co
   # VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```

---

## 📝 Usage Example

```typescript
import { useAuth, useGames } from '@/hooks';
import { useAuthContext } from '@/contexts/AuthContext';

function GameListing() {
  const { user } = useAuthContext();
  const { games, searchGames, loading } = useGames();

  useEffect(() => {
    if (user) {
      searchGames({ sortBy: 'newest', limit: 50 });
    }
  }, [user]);

  return (
    <div>
      {loading && <p>Loading...</p>}
      {games.items.map(game => (
        <div key={game.id}>
          <h3>{game.title}</h3>
          <p>${game.price}</p>
          <img src={game.images?.[0]?.image_url} alt={game.title} />
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ What's Done

**Week 1:**
- ✅ Database schema (14 tables, RLS, indexes)
- ✅ TypeScript types (30+ interfaces)
- ✅ Service layer (70+ functions)

**Week 2:**
- ✅ 8 custom hooks (useAuth, useGames, useForum, useMessages, useFriends, useWishlist, useProfile, useSeller)
- ✅ Auth context provider
- ✅ Barrel exports (clean imports)

---

## 🚀 What's Next (Week 3)

- Auth pages (signup, login, forgot password)
- Game marketplace UI integration
- Forum pages
- Messaging UI + realtime
- Seller dashboard
- Notifications
- Error boundaries
- Loading skeletons
- Polish + deploy

---

## 🎯 Key Principles

1. **No ambiguous columns** — `user_id` for ownership, `author_id` for content
2. **Type-safe** — 100% TypeScript coverage
3. **Services first** — Business logic in services, not components
4. **Hooks manage state** — Components stay dumb
5. **Error handling** — Try/catch + logging everywhere
6. **RLS from day one** — Every table protected by row-level security
7. **Realtime ready** — Messaging uses Supabase realtime subscription

---

## 📞 Support

All services log errors to console. Check browser console for detailed error messages.

Use `import { supabase } from '@/integrations/supabase'` for direct queries if needed (shouldn't be).

---

**Built for speed, polish, and no bugs.**

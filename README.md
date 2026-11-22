# ChatWave

**Live demo: [chatwaveofficial.vercel.app](https://chatwaveofficial.vercel.app)**

A polished, real-time chat application built with React, Vite, Tailwind CSS and Supabase. It ships with a responsive dark interface, authentication, live messaging, presence, read receipts, attachments and a full set of message actions.

![ChatWave sign-in page](docs/login.png)

*ChatWave sign-in page — clean, responsive and focused on the conversation.*

## Features

- **Authentication** — email/password sign up and sign in powered by Supabase Auth, with a username (3-20 characters, no spaces), a password-strength indicator and protected app routes.
- **Username search** — people are not listed by default in "New chat"; search by their full username to find an account and start messaging. Username can be set during signup or later in Profile settings.
- **Real-time messaging** — instant 1:1 and group conversations using Supabase Realtime.
- **Group chats** — create a named group, pick multiple members, see who is online, rename the group, transfer admin rights, add/remove members, leave or delete the group, and view sender names on each message.
- **Contacts & new chats** — pick a contact to start a conversation; duplicate direct chats are prevented by a database function.
- **Presence** — online status and last-seen information, plus typing indicators.
- **Read receipts & unread counts** — per-conversation read state, unread badges and an unread count in the browser tab title.
- **Rich messages** — emoji picker, emoji rendering, reply threads, reactions and forwarded messages.
- **Attachments** — image uploads (up to 5 MB) and file uploads (up to 25 MB) via Supabase Storage, with captions and file details.
- **Message actions** — edit, delete (for you / for everyone), star, forward, pin and archive.
- **Disappearing messages** — per-chat setting for **Off**, **24 hours** (auto-hide one day after sending) or **After viewing** (a message disappears as soon as it is seen). The setting applies to new messages.
- **Profiles** — display name, avatar colour, uploaded avatar photo and a bio/about section.
- **Calls** — free peer-to-peer 1:1 voice and video calls using WebRTC, with Supabase Realtime as the signaling layer, mute controls and call states.
- **Notifications** — optional notification sounds, browser desktop notifications and Web Push for the installed app.
- **Installable app (PWA)** — full-screen standalone mode with a home-screen icon and offline app shell.
- **Status updates** — post text or photo statuses that disappear after 24 hours, with view counts and a WhatsApp-style Status tab.
- **Communities** — a Community tab listing all groups with member counts and quick access to create or open one.
- **Block contacts** — long-press a chat for a WhatsApp-style menu with pin/archive/mute/block and more; blocked users disappear from search and cannot be messaged or called.
- **Comfort controls** — sound toggle and reduced-motion support, stored in local storage.
- **Responsive UI** — glassy dark theme that works on desktop and mobile.

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 19, Tailwind CSS 4 |
| Build tool | Vite 8 |
| Backend / Database | Supabase (Postgres, Auth, Storage, Realtime) |
| Icons | Lucide React |
| Linting | Oxlint |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your Supabase project values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find both values in **Supabase Dashboard → Project Settings → API**. Never commit `.env` — it is already ignored by Git.

### 3. Set up the database

Create a Supabase project, then open **SQL Editor** and run the SQL files in `supabase/` in this exact order:

| File | What it adds |
| --- | --- |
| `schema.sql` | Base schema: profiles, conversations, members, messages, RLS policies, triggers and Realtime publication |
| `schema2.sql` | Presence, typing indicators, read receipts and unread counts |
| `schema3.sql` | Duplicate-direct-chat prevention helper |
| `schema4.sql` | Avatar uploads (`avatars` bucket) and profile Realtime |
| `schema5.sql` | Image attachments (`chat-images` bucket) |
| `schema6.sql` | Replies, reactions and the forwarded flag |
| `schema7.sql` | Profile bio/about field |
| `schema8.sql` | Edit/delete actions, reaction policies and file attachments (`chat-files` bucket) |
| `schema9.sql` | Group membership management policies and Realtime for membership changes |
| `schema10.sql` | Group rename, admin transfer policies and Realtime for conversation changes |
| `schema11.sql` | Disappearing messages columns and per-chat timer policy |
| `schema12.sql` | Username column and signup trigger update |
| `schema13.sql` | Safer update grants, disappearing-timer RPC, message edit guard and unique usernames |
| `schema16.sql` | Blocked users table and policies |
| `schema17.sql` | Status updates, views, storage bucket and Realtime |
| `schema18.sql` | Web push subscription table and policies |
| `schema19.sql` | Persisted call invites, RLS policies and Realtime publication |

Each migration is idempotent where possible (`if not exists` / `drop policy if exists`), so re-running one is safe. Make sure email/password sign-in is enabled in **Authentication → Providers**.

Calls use free public STUN servers and need microphone/camera permission plus HTTPS (localhost and Netlify both work). For calls behind restrictive NAT, add a TURN server to `VITE_TURN_URL`, `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL` in `.env`; calls are 1:1 only.

For PWA + background push: run `schema18.sql`, deploy to Vercel, and set `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `WEBHOOK_SECRET`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the Vercel project's environment variables. Then create a Supabase Database Webhook on `messages` (INSERT) pointing to `https://<your-site>/api/notify` with header `x-webhook-secret` equal to `WEBHOOK_SECRET`. Install via the browser's "Add to Home Screen" and enable Push notifications in Settings. The same webhook handler also works on Netlify at `/.netlify/functions/notify`.

For incoming calls to alert users while the app is closed, create a second Database Webhook on `call_invites` (INSERT) pointing at the same `/api/notify` endpoint with the same `x-webhook-secret` header. The server sends a high-priority call notification; tapping Answer (or the notification itself) opens the app with the incoming call restored from the persisted invite.

### 4. Run the app

```bash
npm run dev
```

Open the local URL printed by Vite. Build and lint with:

```bash
npm run build
npm run lint
```

## Project structure

```text
src/
├── components/     UI components (sidebar, chat window, composer, group/new-chat modals, bubbles, avatar…)
├── context/        AuthContext — Supabase auth state
├── hooks/          Chats, presence, typing, notifications and sound hooks
├── lib/            Supabase client and sound helpers
├── pages/          AuthScreen
├── App.jsx         App shell, chat state and all message actions
├── index.css       Tailwind theme and global styles
└── main.jsx        React entry point
supabase/           SQL migrations (schema.sql → schema18.sql)
public/             Logo, favicon and icons
docs/               Screenshots used in this README
```

## Security notes

- Only `VITE_SUPABASE_URL` and the **anon** key belong in the frontend. Row Level Security (RLS) in the SQL migrations controls what authenticated users may read and write.
- Never expose a `service_role` key in client code or in `.env` files that get committed.
- Keep `.env` local and use `.env.example` to document the required variables.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint over the source |

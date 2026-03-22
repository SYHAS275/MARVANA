# AI Adda - AI Dost Chat App

AI Adda is an Expo + React Native app for chatting with culturally-grounded AI characters in Hinglish, with support for both 1:1 and multi-character group conversations.

## What It Does

- Onboards users with name + character preference flow
- Lets users chat 1:1 with AI characters
- Supports group chats where multiple AI characters can respond in sequence
- Includes prebuilt "scene" templates for group chat setups
- Streams model output token-by-token for live typing experience
- Adds lightweight input moderation for unsafe content + PII patterns
- Uses Supabase Auth (email/password) for signup/login
- Stores user profile data in Supabase (`profiles` table)
- Stores chats/messages locally in AsyncStorage

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- Expo Router
- Zustand (state management)
- Anthropic SDK (`@anthropic-ai/sdk`) for model responses
- Supabase (Auth + Postgres)
- TypeScript

## Project Structure

```txt
src/
  app/                  # Router screens (tabs, chat, groups, onboarding)
  components/           # Reusable UI components
  data/                 # Character definitions, scenarios, dynamics, starters
  services/             # AI service, moderation, local storage helpers
  store/                # Zustand stores for user/onboarding/chat state
  theme/                # Color, spacing, typography tokens
  types/                # Shared TypeScript types
```

## Prerequisites

- Node.js 18+
- npm 9+
- iOS Simulator / Android Emulator (optional, for native testing)
- Expo Go app (optional, for device testing)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
cp .env.example .env
```

3. Set your environment variables in `.env`:

```bash
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key_here
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
```

4. In Supabase SQL editor, run:

```sql
-- file: supabase/schema.sql
```

5. Start the app:

```bash
npm run start
```

Then run on a target:

- `npm run ios`
- `npm run android`
- `npm run web`

## Available Scripts

- `npm run start` - Start Expo dev server
- `npm run ios` - Launch iOS target
- `npm run android` - Launch Android target
- `npm run web` - Launch web target

## Core Behavior Notes

- AI responses are designed to be short (chat-like), Hinglish, and character-consistent.
- Group conversations use character dynamics and responder selection logic.
- Messages stream live and can be regenerated in 1:1 chats.
- Moderation blocks common unsafe keywords and simple PII patterns before sending.

## Supabase Setup (Free Tier)

- Create a free Supabase project.
- Use only these free-tier components:
  - Auth (email/password)
  - Postgres table (`profiles`)
- Optional but recommended for smooth signup UX:
  - In Auth settings, disable email confirmations for development.
- SQL schema + RLS policies are in `supabase/schema.sql`.

## Data + Persistence

- Auth users and profile data are stored in Supabase.
- Chat data is still stored locally in AsyncStorage.
- API requests are made directly from client code.

## Security Note

- Do not commit real API keys.
- Keep `.env` local and use `.env.example` for shared setup docs.

## Current Scope

This repo currently focuses on product UX, state management, prompt orchestration, and character experience. It does not yet include:

- Server-side key handling/proxying
- Production-grade moderation pipeline
- Automated test suite

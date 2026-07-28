# PAU Interconnect Frontend

This is the Next.js frontend for the PAU Interconnect platform.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. `cd frontend/pau-interconnect-app`
2. `npm install`

### Environment Variables

Create a `.env.local` file with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL` (optional, recommended)

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL=http://localhost:3000/dashboard
```

If `NEXT_PUBLIC_AUTH_SIGNUP_REDIRECT_URL` is set, it must be allowlisted in Supabase Auth redirect URLs.

Validate environment setup:

```bash
npm run check:env
```

### Development

Run the development server:

```bash
npm run dev
```

### Quality Checks

Run full local verification before pushing changes:

```bash
npm run verify
```

Quick commands:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:ci`
- `npm run build`

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4, MUI Joy
- **Icons**: Lucide React, MUI Icons
- **Animations**: Framer Motion

## 📂 Structure

- `app/`: Main routing and page components.
- `components/`: Reusable UI elements (Buttons, Cards, Modals).
- `lib/`: Supabase client and shared utilities.
- `context/`: React context providers for global state.

## 📄 License

This project is developed by Hillary Ilona. It is not an official Pan-Atlantic University project.

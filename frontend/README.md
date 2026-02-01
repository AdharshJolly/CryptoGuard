# CryptoGuard Frontend

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Node](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](../LICENSE)

A Next.js-based blockchain forensics and regulatory technology platform with MetaMask wallet authentication for users and username/password authentication for administrators.

> 📁 **Part of the [CryptoGuard Monorepo](../README.md)** - See root directory for full project setup and architecture.

## Features

✨ **User Authentication (MetaMask)**

- Secure wallet-based authentication using signature verification
- Nonce-based challenge-response for security
- JWT-based session management
- Multi-wallet support

🔐 **Admin Authentication**

- Email/password authentication
- Protected admin routes with role-based access control
- Session management and secure logout

📊 **Dashboard Features**

- Real-time transaction visualization
- Interactive force-directed graphs for transaction networks
- 3D laundering topology visualization
- Case management system
- Advanced analytics and reporting

🎨 **UI/UX**

- Responsive design for all devices
- Dark mode support
- Smooth animations and transitions
- Accessible components (WCAG compliant)

## Tech Stack

| Category            | Technologies                         |
| ------------------- | ------------------------------------ |
| **Framework**       | Next.js 14 (App Router)              |
| **Language**        | TypeScript 5.0                       |
| **Styling**         | Tailwind CSS 4, PostCSS              |
| **Authentication**  | JWT (jose library), MetaMask         |
| **Web3**            | ethers.js for blockchain interaction |
| **UI Components**   | Radix UI primitives                  |
| **Visualization**   | Three.js, react-force-graph-2d       |
| **Animations**      | Framer Motion                        |
| **Package Manager** | npm/yarn                             |

## Quick Start

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm or yarn
- MetaMask browser extension ([Install](https://metamask.io/))

### Installation

```bash
# Clone from monorepo (if not already cloned)
git clone <repo-link>
cd CryptoGuard/frontend

# Install dependencies
npm install
```

### Environment Setup

Create a `.env.local` file in the frontend root:

```env
# Authentication Secret (generate: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin Credentials
ADMIN_EMAIL=admin@cryptoguard.io
ADMIN_PASSWORD=admin123

# API Configuration (optional)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start exploring!

### Production Build

```bash
npm run build
npm start
```

## Authentication

### User Flow (MetaMask)

```
User Access
    ↓
Connect Wallet (MetaMask)
    ↓
Request Nonce from /api/auth/wallet/nonce
    ↓
Sign Nonce with MetaMask
    ↓
Verify Signature at /api/auth/wallet/verify
    ↓
JWT Token Set (HTTP-only cookie)
    ↓
Access Protected Routes
```

### Admin Flow

```
Admin Access
    ↓
Login Form (/auth/admin)
    ↓
Submit Email/Password
    ↓
Verify Credentials
    ↓
JWT Token Set (HTTP-only cookie)
    ↓
Access Admin Dashboard
```

## API Routes

| Endpoint                  | Method | Description                     |
| ------------------------- | ------ | ------------------------------- |
| `/api/auth/admin/login`   | POST   | Admin login with email/password |
| `/api/auth/wallet/nonce`  | POST   | Get nonce for wallet address    |
| `/api/auth/wallet/verify` | POST   | Verify wallet signature         |
| `/api/auth/session`       | GET    | Get current session             |
| `/api/auth/logout`        | POST   | Clear session                   |

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/auth/              # Authentication API routes
│   │   │   ├── admin/login
│   │   │   ├── wallet/nonce
│   │   │   ├── wallet/verify
│   │   │   ├── session
│   │   │   └── logout
│   │   ├── auth/admin/            # Admin login page
│   │   ├── user/                  # User dashboard (protected)
│   │   ├── admin/                 # Admin dashboard (protected)
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout wrapper
│   │   └── page.tsx               # Home/landing page
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── ...
│   │   └── visualizations/        # Data visualization components
│   │       ├── GraphVisualization.tsx
│   │       ├── Topology3D.tsx
│   │       └── ...
│   ├── lib/
│   │   ├── auth.ts                # Auth utilities (JWT, nonce)
│   │   ├── auth-context.tsx       # Auth state management
│   │   ├── wallet-service.ts      # MetaMask integration
│   │   ├── api/                   # API client utilities
│   │   └── utils.ts               # General utilities
│   ├── providers/
│   │   └── auth-provider.tsx      # Auth context provider
│   ├── styles/
│   │   ├── tailwind.css
│   │   ├── theme.css
│   │   └── fonts.css
│   └── middleware.ts              # Next.js middleware (auth guards)
├── next.config.mjs                # Next.js configuration
├── tsconfig.json                  # TypeScript config
├── package.json                   # Dependencies
└── README.md                       # This file
```

## API Endpoints

### Authentication

| Endpoint                  | Method | Description                | Auth Required |
| ------------------------- | ------ | -------------------------- | ------------- |
| `/api/auth/admin/login`   | POST   | Admin email/password login | ❌            |
| `/api/auth/wallet/nonce`  | POST   | Get nonce for wallet sign  | ❌            |
| `/api/auth/wallet/verify` | POST   | Verify wallet signature    | ❌            |
| `/api/auth/session`       | GET    | Get current user session   | ✅            |
| `/api/auth/logout`        | POST   | Clear session & logout     | ✅            |

### Available Scripts

```bash
# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code with ESLint
npm run lint

# Type check
npx tsc --noEmit
```

## Web3 Integration

The frontend integrates with blockchain networks through:

- **MetaMask**: Primary wallet provider for user authentication
- **ethers.js**: Ethereum library for wallet interactions
- **Signature Verification**: ECDSA for secure message signing

## Development Guidelines

- **Component Structure**: Keep components small and focused
- **Type Safety**: Always use TypeScript for new code
- **CSS**: Use Tailwind CSS utility classes
- **API Calls**: Use the utility functions in `lib/api/`
- **State Management**: Use React Context (auth-context) for global state

## Related Documentation

- [Main README](../README.md)
- [Architecture Guide](../ARCHITECTURE.md)
- [Setup Instructions](../SETUP.md)
- [Backend Documentation](../backend/README.md)

## License

MIT License - See [LICENSE](../LICENSE) for details

```

## Demo Credentials

**Admin Access:**

- Email: `admin@cryptoguard.io`
- Password: `admin123`

**User Access:**

- Connect any MetaMask wallet

## Security Considerations

For production:

1. Generate a strong `JWT_SECRET`
2. Use a database to store admin credentials (hashed)
3. Store nonces in Redis with proper expiration
4. Enable HTTPS
5. Add rate limiting to auth endpoints
6. Implement proper signature verification with replay attack protection
```

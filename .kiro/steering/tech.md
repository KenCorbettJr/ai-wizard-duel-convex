# Technology Stack

## Core Framework

- **Next.js 16.0.0** with App Router and React 19
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling with custom animations
- **Convex** for backend database and real-time functionality

## Key Libraries

- **Clerk** for authentication and user management
- **Radix UI** components for accessible UI primitives
- **Lucide React** for icons
- **Zod** for schema validation
- **AI Integration**: Google AI (Genkit), FAL AI for image generation

## Development Tools

- **Vitest** for unit testing with edge-runtime environment
- **Cypress** for end-to-end testing
- **ESLint + Prettier** for code formatting
- **Convex Test** for backend testing

## Common Commands

### Development

```bash
npm run dev          # Start Next.js + Convex dev servers
npm run dashboard    # Open Convex dashboard
```

### Testing

```bash
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run cypress:open # Open Cypress UI
npm run cypress:emulate # Run E2E tests with emulator
```

### Deployment

```bash
npm run build        # Build Next.js application
npm run deploy       # Deploy Convex backend
npm run lint:fix     # Fix linting and formatting issues
```

## Environment Setup

- Requires `.env.local` for API keys and configuration
- Supports `ENV=dev|emulate` for different deployment modes
- Uses Convex for real-time data synchronization

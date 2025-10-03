# Project Structure

## Frontend Organization (`src/`)

### App Router Structure (`src/app/`)

- **Route Groups**: `(auth)` for authentication pages
- **Dynamic Routes**: `[id]` for wizard/duel details, `[shortcode]` for duel joining
- **Nested Layouts**: Each major section has its own layout component
- **Page Structure**:
  - `/` - Landing page
  - `/dashboard` - User dashboard
  - `/wizards` - Wizard management
  - `/duels` - Duel creation, joining, watching
  - `/admin` - Admin-only features

### Components (`src/components/`)

- **UI Components**: Reusable Radix UI-based components in `ui/`
- **Feature Components**: Domain-specific components (Wizard, Duel, etc.)
- **Layout Components**: AppLayout, Navbar, LeftSidebar
- **Form Components**: Separate components for create/edit operations

### Supporting Directories

- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and configurations
- `src/providers/` - React context providers
- `src/types/` - TypeScript type definitions

## Backend Organization (`convex/`)

### Database Schema (`schema.ts`)

- **Core Tables**: users, wizards, duels, duelRounds
- **Relationships**: Proper foreign key references with indexes
- **Type Safety**: Zod validation for all data structures

### API Functions

- **Queries**: Read operations (prefixed with `get`)
- **Mutations**: Write operations (prefixed with `create`, `update`, `delete`)
- **File Naming**: Feature-based (e.g., `duels.ts`, `wizards.ts`)
- **Admin Functions**: Separate `.admin.` files for privileged operations

### Testing Structure

- **Unit Tests**: `.test.ts` files alongside implementation
- **Test Utils**: Shared testing utilities in `test_utils.ts`
- **Mocks**: Separate `mocks/` directory for test doubles

## Configuration Files

- **TypeScript**: Separate configs for main app and tests
- **Testing**: Vitest for backend, Cypress for E2E
- **Styling**: Tailwind with component configuration
- **Linting**: ESLint + Prettier with Next.js rules

## Key Patterns

- **Authentication**: Clerk integration with role-based access
- **Real-time Updates**: Convex subscriptions for live data
- **Type Safety**: End-to-end TypeScript with Zod validation
- **Component Composition**: Radix UI primitives with custom styling

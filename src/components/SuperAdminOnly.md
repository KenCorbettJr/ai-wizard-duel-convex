# SuperAdminOnly Component

The `SuperAdminOnly` component is a wrapper that conditionally renders its children based on whether the current user has super admin privileges. It provides a clean way to gate content that should only be accessible to super administrators.

## Features

- **Automatic Permission Checking**: Uses Convex queries to verify super admin access
- **Flexible Fallback Options**: Supports custom fallback content or complete hiding
- **Loading States**: Shows appropriate loading UI while checking permissions
- **Error Handling**: Displays clear error messages when access is denied

## Usage

### Basic Usage

```tsx
import { SuperAdminOnly } from "@/components/SuperAdminOnly";

function MyComponent() {
  return (
    <SuperAdminOnly>
      <div>This content is only visible to super admins</div>
    </SuperAdminOnly>
  );
}
```

### With Custom Fallback

```tsx
<SuperAdminOnly
  fallback={
    <div className="text-center py-8">
      <p>This feature is only available to administrators.</p>
    </div>
  }
>
  <AdminPanel />
</SuperAdminOnly>
```

### Completely Hidden (No Fallback)

```tsx
<SuperAdminOnly fallback={null}>
  <DangerousAdminTools />
</SuperAdminOnly>
```

## Props

| Prop       | Type              | Default            | Description                                                                    |
| ---------- | ----------------- | ------------------ | ------------------------------------------------------------------------------ |
| `children` | `React.ReactNode` | -                  | Content to render when user has super admin access                             |
| `fallback` | `React.ReactNode` | Default error card | Content to render when user doesn't have access. Use `null` to hide completely |

## Permission Logic

The component uses the `api.duels.checkAdminAccess` Convex query to determine access:

1. **Development Mode**: Automatically grants access in development environment
2. **Database Check**: Verifies user role in the users table
3. **Role Validation**: Requires `super_admin` role for access

## States

### Loading State

Shows a loading card with shield icon while checking permissions.

### Access Denied State

Shows an error card with:

- Clear "Access Denied" message
- Specific reason for denial
- Contact information for support

### Access Granted State

Renders the children components normally.

## Examples

See `src/components/examples/SuperAdminExample.tsx` for comprehensive usage examples.

## Integration

The component is currently used in:

- `/admin/duels` - Admin dashboard page
- `/duels` - Super admin panel card (with null fallback)

## Security Notes

- Always use server-side validation in addition to client-side gating
- The component is for UI purposes only - backend APIs must enforce permissions
- All admin actions should be logged and monitored

import { createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryProvider } from '@/providers/QueryProvider';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <QueryProvider>
      <Outlet />
    </QueryProvider>
  );
}

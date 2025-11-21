"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Skeleton loader component for UserListTable
 *
 * Displays animated placeholder rows while user data is loading
 */
interface UserListTableSkeletonProps {
  rows?: number;
}

export function UserListTableSkeleton({
  rows = 5,
}: UserListTableSkeletonProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Join Date</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead className="text-center">Wizards</TableHead>
            <TableHead className="text-center">Duels</TableHead>
            <TableHead className="text-center">Campaign</TableHead>
            <TableHead className="text-center">Credits</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(rows)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <div className="space-y-1">
                  <div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" />
                  <div className="h-3 w-12 bg-muted animate-pulse rounded mx-auto" />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="space-y-1">
                  <div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded mx-auto" />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-12 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell>
                <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Settings, User, Shield, AlertTriangle } from "lucide-react";

export default function DevToolsPage() {
  const [emailToPromote, setEmailToPromote] = useState("");

  // Queries
  const currentUserDebug = useQuery(api.admin.debugCurrentUser);
  const allUsers = useQuery(api.admin.listUsersWithRoles);

  // Mutations
  const promoteUser = useMutation(api.admin.promoteUserToSuperAdmin);

  // Handle promoting user
  const handlePromoteUser = async () => {
    if (!emailToPromote.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      const result = await promoteUser({ userEmail: emailToPromote.trim() });
      if (result.success) {
        toast.success(result.message);
        setEmailToPromote("");
      }
    } catch (error) {
      toast.error("Failed to promote user: " + (error as Error).message);
    }
  };

  // Check if we're in development mode
  const isDevelopment = currentUserDebug?.environment === "development";

  if (!isDevelopment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
        <div className="container mx-auto px-6 py-12">
          <Card className="max-w-2xl mx-auto border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-16 w-16 mx-auto text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-red-800 dark:text-red-200">
                Development Tools Not Available
              </h3>
              <p className="text-red-700 dark:text-red-300">
                This page is only available in development mode for security
                reasons.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Settings className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              Development Tools
            </h2>
            <p className="text-muted-foreground">
              Admin utilities for development and testing (development mode
              only)
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Current User Debug Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Current User Debug Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentUserDebug ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Environment</Label>
                      <p className="text-sm text-muted-foreground">
                        {currentUserDebug.environment}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Clerk Subject
                      </Label>
                      <p className="text-sm text-muted-foreground font-mono">
                        {currentUserDebug.subject}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Database User
                      </Label>
                      {currentUserDebug.databaseUser ? (
                        <div className="text-sm text-muted-foreground">
                          <p>Email: {currentUserDebug.databaseUser.email}</p>
                          <p>
                            Role:{" "}
                            <span className="font-semibold">
                              {currentUserDebug.databaseUser.role}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">
                          User not found in database
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>

            {/* Promote User to Super Admin */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Promote User to Super Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailToPromote}
                    onChange={(e) => setEmailToPromote(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <Button onClick={handlePromoteUser} className="w-full">
                  Promote to Super Admin
                </Button>
                <p className="text-xs text-muted-foreground">
                  This will give the user full admin access to all admin pages
                  and functions.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* All Users List */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              {allUsers ? (
                <div className="space-y-2">
                  {allUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Created:{" "}
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === "super_admin"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : user.role === "admin"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Loading users...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

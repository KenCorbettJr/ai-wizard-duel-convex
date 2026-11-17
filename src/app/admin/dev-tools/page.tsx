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
import { PageHeader } from "@/components/PageHeader";

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
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
          <Card className="max-w-2xl mx-auto border-destructive/40 bg-destructive/10">
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-destructive">
                Development Tools Not Available
              </h3>
              <p className="text-destructive">
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <PageHeader
            title="Development Tools"
            description="Admin utilities for development and testing (development mode
              only)"
            icon={<Settings className="h-6 w-6" aria-hidden="true" />}
          />

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
                        <p className="text-sm text-destructive">
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
                              ? "bg-destructive/15 text-destructive"
                              : user.role === "admin"
                                ? "bg-warning/15 text-warning"
                                : "bg-muted text-foreground"
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

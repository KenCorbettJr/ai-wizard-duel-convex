"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import posthog from "posthog-js";

interface ProfileEditFormProps {
  onSuccess?: () => void;
}

export function ProfileEditForm({ onSuccess }: ProfileEditFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get current user profile status to populate form
  const profileStatus = useQuery(api.userProfiles.getCurrentUserProfileStatus);
  const updateProfile = useMutation(api.userProfiles.updateUserProfile);

  // Initialize form with current display name when data loads
  React.useEffect(() => {
    if (profileStatus?.displayName && !displayName) {
      setDisplayName(profileStatus.displayName);
    }
  }, [profileStatus?.displayName, displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateProfile({
        displayName: displayName.trim(),
      });

      if (result.success) {
        posthog.capture("profile_updated");
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onSuccess?.();
        }, 2000);
      } else {
        setError(result.error || "Failed to update profile");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profileStatus) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profileStatus.hasProfile) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <p className="text-center text-foreground">
            Please complete your profile setup first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User ID (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              value={profileStatus.userId || ""}
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              User ID cannot be changed after creation
            </p>
          </div>

          {/* Display Name (editable) */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              maxLength={50}
              required
            />
            <p className="text-xs text-muted-foreground">
              {displayName.length}/50 characters
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/40 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-3 bg-success/10 border border-success/40 rounded-md">
              <p className="text-sm text-success">
                Profile updated successfully!
              </p>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitting || !displayName.trim()}
            className="w-full"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

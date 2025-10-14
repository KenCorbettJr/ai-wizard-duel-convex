"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface ProfileSetupFormProps {
  onComplete: (userId: string) => void;
  initialName?: string;
}

export function ProfileSetupForm({
  onComplete,
  initialName,
}: ProfileSetupFormProps) {
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState(initialName || "");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    available: boolean;
    suggestion?: string;
  } | null>(null);
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkAvailability = useQuery(
    api.userProfiles.checkUserIdAvailability,
    userId.length >= 3 ? { userId } : "skip",
  );

  const setUserIdMutation = useMutation(api.userProfiles.setUserId);

  // Debounced availability checking
  useEffect(() => {
    if (userId.length < 3) {
      setAvailabilityResult(null);
      setIsCheckingAvailability(false);
      return;
    }

    setIsCheckingAvailability(true);
    const timer = setTimeout(() => {
      if (checkAvailability) {
        setAvailabilityResult(checkAvailability);
        setIsCheckingAvailability(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [checkAvailability, userId]);

  // Format validation
  const validateFormat = (value: string): string => {
    if (value.length < 3) {
      return "User ID must be at least 3 characters long";
    }
    if (value.length > 20) {
      return "User ID must be no more than 20 characters long";
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return "User ID can only contain letters, numbers, underscores, and hyphens";
    }
    return "";
  };

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    const formatError = validateFormat(value);
    setValidationError(formatError);

    if (formatError) {
      setAvailabilityResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formatError = validateFormat(userId);
    if (formatError) {
      setValidationError(formatError);
      return;
    }

    if (!availabilityResult?.available) {
      return;
    }

    setIsSubmitting(true);
    try {
      await setUserIdMutation({
        userId,
        displayName: displayName.trim() || undefined,
      });
      onComplete(userId);
    } catch (error) {
      console.error("Failed to set user ID:", error);
      setValidationError("Failed to create profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    userId.length >= 3 &&
    !validationError &&
    availabilityResult?.available &&
    !isCheckingAvailability &&
    !isSubmitting;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          Choose a unique user ID to personalize your wizard profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => handleUserIdChange(e.target.value)}
              placeholder="your-username"
              className={
                validationError ||
                (availabilityResult && !availabilityResult.available)
                  ? "border-red-500"
                  : availabilityResult?.available
                    ? "border-green-500"
                    : ""
              }
            />
            <div className="min-h-[20px] text-sm">
              {isCheckingAvailability && (
                <span className="text-gray-500">Checking availability...</span>
              )}
              {validationError && (
                <span className="text-red-500">{validationError}</span>
              )}
              {!validationError &&
                availabilityResult &&
                !isCheckingAvailability && (
                  <>
                    {availabilityResult.available ? (
                      <span className="text-green-600">✓ Available</span>
                    ) : (
                      <span className="text-red-500">
                        ✗ Not available
                        {availabilityResult.suggestion && (
                          <span className="block">
                            Try: {availabilityResult.suggestion}
                          </span>
                        )}
                      </span>
                    )}
                  </>
                )}
            </div>
            <p className="text-xs text-gray-500">
              3-20 characters, letters, numbers, underscores, and hyphens only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
            <p className="text-xs text-gray-500">
              This is how others will see your name
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {isSubmitting ? "Creating Profile..." : "Complete Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

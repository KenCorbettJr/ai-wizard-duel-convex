"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, UserCheck } from "lucide-react";

export function LobbyStatusIndicator() {
  const userLobbyStatus = useQuery(api.duelLobby.getUserLobbyStatus);

  if (!userLobbyStatus) {
    return null;
  }

  const getStatusIcon = () => {
    switch (userLobbyStatus.status) {
      case "WAITING":
        return <Clock className="h-3 w-3" />;
      case "MATCHED":
        return <UserCheck className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (userLobbyStatus.status) {
      case "WAITING":
        return "secondary";
      case "MATCHED":
        return "default";
      default:
        return "secondary";
    }
  };

  const getStatusText = () => {
    switch (userLobbyStatus.status) {
      case "WAITING":
        return "In Lobby";
      case "MATCHED":
        return "Matched";
      default:
        return "Unknown";
    }
  };

  return (
    <Badge variant={getStatusColor()} className="text-xs">
      {getStatusIcon()}
      <span className="ml-1">{getStatusText()}</span>
    </Badge>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap } from "lucide-react";
import Image from "next/image";

interface TrophyHallProps {
  wizardId: Id<"wizards">;
}

export function TrophyHall({ wizardId }: TrophyHallProps) {
  const defeatedWizards = useQuery(api.wizards.getDefeatedWizards, {
    wizardId,
  });

  if (defeatedWizards === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Trophy Hall
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!defeatedWizards || defeatedWizards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Trophy Hall
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No victories yet. Challenge other wizards to start building your
              trophy collection!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Trophy Hall
          <Badge variant="secondary" className="ml-2">
            {defeatedWizards.length}{" "}
            {defeatedWizards.length === 1 ? "Victory" : "Victories"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {defeatedWizards.map((wizard) => {
            const defeatedDate = new Date(
              wizard.defeatedAt
            ).toLocaleDateString();
            return (
              <div
                key={wizard._id}
                className="group relative aspect-square rounded-lg overflow-hidden border-2 border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 hover:scale-105 transition-transform cursor-pointer"
                title={`Defeated ${wizard.name} on ${defeatedDate}`}
              >
                {wizard.illustration || wizard.illustrationURL ? (
                  <div className="w-full h-full relative">
                    {wizard.illustration ? (
                      <ConvexImage
                        storageId={wizard.illustration}
                        alt={wizard.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : wizard.illustrationURL ? (
                      <Image
                        src={wizard.illustrationURL}
                        alt={wizard.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                )}

                {/* Trophy overlay */}
                <div className="absolute top-1 right-1">
                  <Trophy className="w-3 h-3 text-yellow-500 drop-shadow-sm" />
                </div>

                {/* Tooltip on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
                  <span className="text-white text-xs font-medium text-center mb-1">
                    {wizard.name}
                  </span>
                  <span className="text-white/80 text-xs text-center">
                    {defeatedDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

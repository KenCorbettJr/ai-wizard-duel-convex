"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { GripVertical, X, Plus } from "lucide-react";
import { Id, Doc } from "../../convex/_generated/dataModel";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexImage } from "@/hooks/useConvexImage";

interface DragDropOpponentSelectorProps {
  selectedOpponents: Id<"wizards">[];
  onOpponentsChange: (opponents: Id<"wizards">[]) => void;
  availableOpponents: Doc<"wizards">[];
  disabled?: boolean;
  maxOpponents?: number;
}

interface SortableOpponentItemProps {
  opponent: Doc<"wizards">;
  index: number;
  onRemove: () => void;
  disabled?: boolean;
}

function SortableOpponentItem({
  opponent,
  index,
  onRemove,
  disabled,
}: SortableOpponentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opponent._id });

  const imageUrl = useConvexImage(
    api.wizards.getIllustrationUrl,
    // @ts-expect-error - "skip" is a valid Convex query parameter
    opponent.illustration ? { storageId: opponent.illustration } : "skip",
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return "bg-success/15 text-success";
      case "INTERMEDIATE":
        return "bg-warning/15 text-warning";
      case "ADVANCED":
        return "bg-destructive/15 text-destructive";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? "z-50" : ""}`}
    >
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            {/* Drag Handle */}
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
              className={`cursor-grab active:cursor-grabbing min-h-11 min-w-11 inline-flex items-center justify-center rounded hover:bg-accent transition-colors touch-none ${
                disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
              disabled={disabled}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>

            {/* Battle Order Number */}
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/12 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {index + 1}
              </span>
            </div>

            {/* Opponent Image: hidden on phones to leave room for the name */}
            <div className="hidden flex-shrink-0 sm:block">
              {opponent.illustration && imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={opponent.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-md object-cover border border-primary/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border border-dashed border-border">
                  <span className="text-xs text-muted-foreground">
                    #{opponent.opponentNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Opponent Info */}
            <div className="flex-1 min-w-0">
              {/* Phones: name on its own line, difficulty underneath */}
              <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <h4 className="w-full truncate text-sm font-medium sm:w-auto">
                  #{opponent.opponentNumber} {opponent.name}
                </h4>
                <Badge
                  className={`text-xs ${getDifficultyColor(
                    opponent.difficulty || "BEGINNER",
                  )}`}
                >
                  {opponent.difficulty}
                </Badge>
              </div>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {opponent.description}
              </p>
            </div>

            {/* Remove Button */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onRemove}
              disabled={disabled}
              aria-label={`Remove ${opponent.name}`}
              className="shrink-0 text-destructive transition-opacity duration-200 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 pointer-fine:md:opacity-0 pointer-fine:md:group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AvailableOpponentItemProps {
  opponent: Doc<"wizards">;
  onAdd: () => void;
  disabled?: boolean;
}

function AvailableOpponentItem({
  opponent,
  onAdd,
  disabled,
}: AvailableOpponentItemProps) {
  const imageUrl = useConvexImage(
    api.wizards.getIllustrationUrl,
    // @ts-expect-error - "skip" is a valid Convex query parameter
    opponent.illustration ? { storageId: opponent.illustration } : "skip",
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return "bg-success/15 text-success";
      case "INTERMEDIATE":
        return "bg-warning/15 text-warning";
      case "ADVANCED":
        return "bg-destructive/15 text-destructive";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <Card className="group transition-all duration-200 hover:shadow-md has-[button:disabled]:opacity-60">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          aria-label={`Add ${opponent.name}`}
          className="flex min-h-14 w-full items-center gap-2 rounded-[inherit] p-2 text-left transition-colors hover:bg-success/5 active:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed"
        >
          {/* Opponent Image */}
          <span className="flex-shrink-0">
            {opponent.illustration && imageUrl ? (
              <Image
                src={imageUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-md border border-primary/30 object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground">
                #{opponent.opponentNumber}
              </span>
            )}
          </span>

          {/* Opponent Info */}
          <span className="min-w-0 flex-1">
            <span className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-2">
              <span className="w-full truncate text-sm font-medium sm:w-auto">
                #{opponent.opponentNumber} {opponent.name}
              </span>
              <span
                className={cn(
                  badgeVariants(),
                  "text-xs",
                  getDifficultyColor(opponent.difficulty || "BEGINNER"),
                )}
              >
                {opponent.difficulty}
              </span>
            </span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">
              {opponent.spellStyle}
            </span>
          </span>

          {/* Add affordance: always visible on touch */}
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-success group-hover:bg-success/10"
          >
            <Plus className="h-4 w-4" />
          </span>
        </button>
      </CardContent>
    </Card>
  );
}

export function DragDropOpponentSelector({
  selectedOpponents,
  onOpponentsChange,
  availableOpponents,
  disabled = false,
  maxOpponents = 10,
}: DragDropOpponentSelectorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Get selected opponent objects in order
  const selectedOpponentObjects = useMemo(() => {
    return selectedOpponents
      .map((id) => availableOpponents.find((op) => op._id === id))
      .filter((op): op is Doc<"wizards"> => op !== undefined);
  }, [selectedOpponents, availableOpponents]);

  // Get available opponents (not selected)
  const unselectedOpponents = availableOpponents.filter(
    (op) => !selectedOpponents.includes(op._id),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = selectedOpponents.findIndex((id) => id === active.id);
      const newIndex = selectedOpponents.findIndex((id) => id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Manual array move implementation to ensure it works
        const newOrder = [...selectedOpponents];
        const [movedItem] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, movedItem);

        onOpponentsChange(newOrder);
      }
    }
  };

  const handleAddOpponent = (opponentId: Id<"wizards">) => {
    if (selectedOpponents.length < maxOpponents) {
      onOpponentsChange([...selectedOpponents, opponentId]);
    }
  };

  const handleRemoveOpponent = (opponentId: Id<"wizards">) => {
    onOpponentsChange(selectedOpponents.filter((id) => id !== opponentId));
  };

  return (
    <div className="space-y-6">
      {/* Selected Opponents - Drag and Drop List */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          Selected Opponents ({selectedOpponents.length}/{maxOpponents})
        </Label>

        {selectedOpponentObjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No opponents selected. Add opponents from the list below.
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedOpponents}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {selectedOpponentObjects.map((opponent, index) => {
                  const opponentId = opponent._id;
                  return (
                    <SortableOpponentItem
                      key={opponentId}
                      opponent={opponent}
                      index={index}
                      onRemove={() => handleRemoveOpponent(opponentId)}
                      disabled={disabled}
                    />
                  );
                })}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="opacity-80">
                  {(() => {
                    const activeOpponent = selectedOpponentObjects.find(
                      (op) => op._id === activeId,
                    );
                    if (activeOpponent) {
                      const index = selectedOpponents.findIndex(
                        (id) => id === activeId,
                      );
                      return (
                        <SortableOpponentItem
                          opponent={activeOpponent}
                          index={index}
                          onRemove={() => {}}
                          disabled={true}
                        />
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Available Opponents */}
      {unselectedOpponents.length > 0 && (
        <div>
          <Label className="text-base font-semibold mb-3 block">
            Available Opponents ({unselectedOpponents.length})
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-60 overflow-y-auto">
            {unselectedOpponents
              .sort((a, b) => (a.opponentNumber || 0) - (b.opponentNumber || 0))
              .map((opponent) => (
                <AvailableOpponentItem
                  key={opponent._id}
                  opponent={opponent}
                  onAdd={() => handleAddOpponent(opponent._id)}
                  disabled={
                    disabled || selectedOpponents.length >= maxOpponents
                  }
                />
              ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpponentsChange([])}
          disabled={disabled || selectedOpponents.length === 0}
        >
          Clear All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const allIds = availableOpponents
              .sort((a, b) => (a.opponentNumber || 0) - (b.opponentNumber || 0))
              .slice(0, maxOpponents)
              .map((op) => op._id);
            onOpponentsChange(allIds);
          }}
          disabled={disabled || availableOpponents.length === 0}
        >
          Select First {Math.min(maxOpponents, availableOpponents.length)}
        </Button>
      </div>
    </div>
  );
}

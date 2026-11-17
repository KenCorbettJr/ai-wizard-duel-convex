import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description: string;
}

export default function FeatureCard({
  icon: Icon,
  emoji,
  title,
  description,
}: FeatureCardProps) {
  return (
    <Card className="sparkle-hover h-full">
      <CardHeader className="text-center">
        {Icon && (
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-arcane text-white shadow-md shadow-primary/30">
            <Icon className="size-6" aria-hidden="true" />
          </div>
        )}
        {emoji && (
          <div className="mb-2 text-2xl" aria-hidden="true">
            {emoji}
          </div>
        )}
        <CardTitle className="min-w-0 break-words text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

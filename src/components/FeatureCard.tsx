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
    <Card className="h-full">
      <CardHeader className="text-center">
        {Icon && <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />}
        {emoji && <div className="text-2xl mb-2">{emoji}</div>}
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

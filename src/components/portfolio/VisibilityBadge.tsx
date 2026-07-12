import { Badge } from "@/components/ui/badge";
import { Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisibilityBadgeProps {
  isPublic: boolean;
  className?: string;
}

export function VisibilityBadge({ isPublic, className }: VisibilityBadgeProps) {
  return (
    <Badge
      variant={isPublic ? "default" : "secondary"}
      className={cn("gap-1", className)}
    >
      {isPublic ? (
        <>
          <Globe className="h-3 w-3" />
          Público
        </>
      ) : (
        <>
          <Lock className="h-3 w-3" />
          Privado
        </>
      )}
    </Badge>
  );
}

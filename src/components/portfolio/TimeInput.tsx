import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { formatTimePreview, minutesToTime, timeToMinutes } from "@/lib/domain/time-utils";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  totalMinutes: number;
  onChange: (minutes: number) => void;
  label?: string;
  tip?: string;
  error?: string;
  disabled?: boolean;
}

export function TimeInput({ totalMinutes, onChange, label, tip, error, disabled }: TimeInputProps) {
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");

  // Initialize from totalMinutes (e.g., when editing existing project)
  useEffect(() => {
    const { hours: h, minutes: m } = minutesToTime(totalMinutes);
    setHours(h.toString());
    setMinutes(m.toString());
  }, [totalMinutes]);

  const handleHoursChange = (value: string) => {
    const parsed = parseInt(value) || 0;
    if (parsed >= 0 && parsed <= 999) {
      setHours(value);
      const mins = parseInt(minutes) || 0;
      onChange(timeToMinutes(parsed, mins));
    }
  };

  const handleMinutesChange = (value: string) => {
    const parsed = parseInt(value) || 0;
    if (parsed >= 0 && parsed <= 59) {
      setMinutes(value);
      const hrs = parseInt(hours) || 0;
      onChange(timeToMinutes(hrs, parsed));
    }
  };

  const preview = formatTimePreview(parseInt(hours) || 0, parseInt(minutes) || 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>{label ?? "Tempo de Impressão"}</Label>
        {(tip || label === undefined) && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{tip ?? "Informe o tempo estimado de impressão"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <Label htmlFor="time-hours" className="text-xs text-muted-foreground">
            Horas
          </Label>
          <Input
            id="time-hours"
            type="number"
            min={0}
            max={999}
            value={hours}
            onChange={(e) => handleHoursChange(e.target.value)}
            disabled={disabled}
            className={cn(error && "border-red-500")}
            placeholder="0"
          />
        </div>

        <div className="flex-1">
          <Label htmlFor="time-minutes" className="text-xs text-muted-foreground">
            Minutos
          </Label>
          <Input
            id="time-minutes"
            type="number"
            min={0}
            max={59}
            value={minutes}
            onChange={(e) => handleMinutesChange(e.target.value)}
            disabled={disabled}
            className={cn(error && "border-red-500")}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tempo total: <span className="font-medium">{preview}</span>
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

import { getEventIcon } from "@/lib/event-icons";
import { cn } from "@/lib/utils";

interface EventIconTileProps {
  /** Stored `icon_key`; null, missing and unknown keys render the default icon. */
  iconKey: string | null | undefined;
  size?: "sm" | "lg";
  /** Desaturates the tile for cancelled and past events. */
  muted?: boolean;
  className?: string;
}

const SIZES = {
  sm: { tile: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { tile: "h-16 w-16 rounded-2xl", icon: "h-8 w-8" },
} as const;

/** Decorative rounded-square tile for an event icon, shared by event cards and the icon picker. */
export function EventIconTile({ iconKey, size = "lg", muted = false, className }: EventIconTileProps) {
  const { icon: Icon, tileClassName } = getEventIcon(iconKey);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center",
        SIZES[size].tile,
        tileClassName,
        muted && "opacity-60 grayscale",
        className,
      )}
    >
      <Icon className={SIZES[size].icon} strokeWidth={1.75} />
    </span>
  );
}

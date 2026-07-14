import { cn } from "@/lib/utils";

interface TeamCrestProps {
  src?: string | null;
  teamName: string;
  size?: number;
  className?: string;
}

export function TeamCrest({ src, teamName, size = 28, className }: TeamCrestProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Escudo ${teamName}`}
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
      />
    );
  }

  const initials = teamName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary",
        className
      )}
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

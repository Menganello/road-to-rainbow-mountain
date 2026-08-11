import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "pink" | "purple" | "orange" | "yellow" | "turquoise" | "blue";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  variant?: "solid" | "outline" | "ghost";
  fullWidth?: boolean;
  icon?: ReactNode;
}

const SOLID_BG: Record<Tone, string> = {
  pink: "bg-rainbow-pink text-white",
  purple: "bg-rainbow-purple text-white",
  orange: "bg-rainbow-orange text-white",
  yellow: "bg-rainbow-yellow text-rainbow-blue",
  turquoise: "bg-rainbow-turquoise text-white",
  blue: "bg-rainbow-blue text-white",
};

const OUTLINE: Record<Tone, string> = {
  pink: "border-rainbow-pink text-rainbow-pink",
  purple: "border-rainbow-purple text-rainbow-purple",
  orange: "border-rainbow-orange text-rainbow-orange",
  yellow: "border-rainbow-yellow text-rainbow-blue",
  turquoise: "border-rainbow-turquoise text-rainbow-turquoise",
  blue: "border-rainbow-blue text-rainbow-blue",
};

const GHOST_TEXT: Record<Tone, string> = {
  pink: "text-rainbow-pink",
  purple: "text-rainbow-purple",
  orange: "text-rainbow-orange",
  yellow: "text-rainbow-yellow",
  turquoise: "text-rainbow-turquoise",
  blue: "text-rainbow-blue",
};

export function Button({
  tone = "blue",
  variant = "solid",
  fullWidth = true,
  icon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 min-h-14 px-6 py-3 rounded-2xl font-body font-extrabold text-base tracking-wide transition-transform active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:active:translate-y-0";
  const skin =
    variant === "solid"
      ? `${SOLID_BG[tone]} shadow-chunky`
      : variant === "outline"
        ? `bg-white/60 border-2 ${OUTLINE[tone]}`
        : GHOST_TEXT[tone];

  return (
    <button className={`${base} ${skin} ${fullWidth ? "w-full" : ""} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}

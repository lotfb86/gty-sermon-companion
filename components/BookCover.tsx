import { Book } from "lucide-react";

interface BookCoverProps {
  title: string;
  subtitle?: string; // e.g., "12 sermons" or "Romans"
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function BookCover({ title, subtitle, size = "md", className = "" }: BookCoverProps) {
  // Dimension mapping - leather-bound book proportions
  const dimensions = {
    sm: "w-[72px] h-[112px]",
    md: "w-24 h-[150px]",
    lg: "w-36 h-56",
  };

  const textSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
  };

  const paddings = {
    sm: "p-2",
    md: "p-2.5",
    lg: "p-3",
  };

  const iconSizes = {
    sm: 10,
    md: 14,
    lg: 18,
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* The Leather-Bound Book Effect */}
      <div
        className={`
          ${dimensions[size]}
          bg-[var(--bg-elevated)]
          rounded-r-md rounded-l-sm
          shadow-lg
          relative
          overflow-hidden
          group
          transition-transform
          hover:-translate-y-1
          cursor-pointer
        `}
      >
        {/* Decorative Leather Texture Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-elevated)] via-[#333] to-[var(--bg-elevated)] opacity-100" />

        {/* Book Spine Details */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#111] opacity-50" />
        <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-white/10" />

        {/* Gold Accent Line (like old books) */}
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-[var(--accent)]/20" />

        {/* Content */}
        <div className={`absolute inset-0 ${paddings[size]} flex flex-col justify-between items-center text-center z-10`}>
          {/* Book Icon at Top */}
          <Book className="text-[var(--accent)]/50" size={iconSizes[size]} />

          {/* Title in Center */}
          <div className="space-y-1 flex-1 flex flex-col justify-center">
            <h3
              className={`
                font-serif
                font-semibold
                text-[var(--gold-text)]
                leading-tight
                line-clamp-3
                break-words
                hyphens-auto
                ${textSizes[size]}
              `}
            >
              {title}
            </h3>
            {subtitle && (
              <p className={`text-[var(--text-secondary)] ${size === 'sm' ? 'text-[8px]' : 'text-[9px]'} uppercase tracking-wider font-sans`}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Decorative Bottom Line */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />
        </div>

        {/* Subtle Shine Effect on Hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </div>
  );
}

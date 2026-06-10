/**
 * Animated "Kurti 3D" logo — multicolor filament lines race across to
 * draw a thumbs-up icon, then the wordmark fades in. Plays once on mount.
 */
export function KurtiLogo({ className = "" }: { className?: string }) {
  const colors = ["#c96f4a", "#e0a93b", "#8aab6e", "#5fa8a3", "#8a3a52"];
  // Thumbs-up silhouette path (simplified)
  const thumbPath =
    "M14 28 L14 46 L20 46 L20 28 Z M22 28 L22 46 Q22 48 24 48 L36 48 Q39 48 40 45 L43 33 Q43.5 30 40.5 30 L32 30 L33 22 Q33.5 18 30 17 Q27 16 26 19 L22 28 Z";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Thumbs-up: 5 layered colored strokes racing in */}
      <svg
        viewBox="0 0 56 56"
        className="h-9 w-9 drop-shadow-sm"
        aria-label="Kurti 3D"
      >
        {colors.map((c, i) => (
          <path
            key={c}
            d={thumbPath}
            fill="none"
            stroke={c}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
              transform: `translate(${(i - 2) * 0.6}px, ${(i - 2) * 0.6}px)`,
              animation: `kurti-draw 1.6s ${i * 0.12}s ease-out forwards`,
            }}
          />
        ))}
        {/* Fill reveal */}
        <path
          d={thumbPath}
          fill="url(#kurti-fill)"
          style={{
            opacity: 0,
            animation: "kurti-fade-in 1.6s 1.4s ease-out forwards",
          }}
        />
        <defs>
          <linearGradient id="kurti-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c96f4a" />
            <stop offset="30%" stopColor="#e0a93b" />
            <stop offset="55%" stopColor="#8aab6e" />
            <stop offset="80%" stopColor="#5fa8a3" />
            <stop offset="100%" stopColor="#8a3a52" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark — letters fade in stacked with filament gradient */}
      <span className="font-display text-xl font-extrabold tracking-tight">
        {"Kurti 3D".split("").map((ch, i) => (
          <span
            key={i}
            className="inline-block"
            style={{
              backgroundImage:
                "linear-gradient(90deg,#c96f4a,#e0a93b,#8aab6e,#5fa8a3,#8a3a52)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              opacity: 0,
              animation: `kurti-fade-in 0.6s ${1.2 + i * 0.08}s ease-out forwards`,
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * Ambient gradient blobs — soft, breathing, fills space.
 * Extracted from Home.jsx to be reusable across pages.
 *
 * @param {('default'|'hero')} variant - blob position/color set
 */
export default function AmbientBlobs({ variant = "default" }) {
  const sets = {
    default: [
      { c: "accent", top: "5%", left: "60%", size: "w-72 h-72", a: "animate-blob" },
      { c: "teal", top: "40%", left: "5%", size: "w-64 h-64", a: "animate-blob-slow" },
      { c: "terracotta", top: "55%", left: "75%", size: "w-56 h-56", a: "animate-blob-fast" },
    ],
    hero: [
      { c: "accent", top: "-5%", left: "65%", size: "w-80 h-80", a: "animate-blob" },
      { c: "teal", top: "30%", left: "-5%", size: "w-72 h-72", a: "animate-blob-slow" },
      { c: "terracotta", top: "60%", left: "80%", size: "w-56 h-56", a: "animate-blob-fast" },
    ],
  };
  const colorMap = {
    accent: "rgb(var(--accent))",
    teal: "rgb(var(--deep-teal))",
    terracotta: "rgb(var(--warm-rose))",
  };
  const blobs = sets[variant] || sets.default;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          className={`absolute ${b.size} ${b.a} rounded-full blur-3xl opacity-[0.08] dark:opacity-[0.12]`}
          style={{ top: b.top, left: b.left, background: colorMap[b.c] }}
        />
      ))}
    </div>
  );
}

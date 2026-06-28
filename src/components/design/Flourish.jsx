/**
 * Gold flourish SVG — decorative scholarly motif.
 * Extracted from Home.jsx to be reusable across pages.
 */
export default function Flourish({ className = "" }) {
  return (
    <svg
      viewBox="0 0 240 20"
      fill="none"
      className={`w-36 md:w-56 h-auto ${className}`}
      aria-hidden="true"
    >
      <path
        d="M0 10h80c0 0 20-6 40 0s20-6 40 0h80"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeOpacity="0.3"
        className="text-accent"
      />
      <circle cx="120" cy="10" r="2.5" className="fill-accent" fillOpacity="0.35" />
      <circle cx="114" cy="10" r="0.8" className="fill-accent" fillOpacity="0.2" />
      <circle cx="126" cy="10" r="0.8" className="fill-accent" fillOpacity="0.2" />
    </svg>
  );
}

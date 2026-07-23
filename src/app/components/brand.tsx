/** Smile-shaped SVG curve — derived from the curved smile stroke in the Yz logo */
export function SmileCurve({ width = 56, opacity = 0.75, className = "" }: {
  width?: number; opacity?: number; className?: string;
}) {
  return (
    <svg aria-hidden="true" width={width} height={Math.round(width * 0.32)} viewBox="0 0 56 18" fill="none" className={className} style={{ display: "block" }}>
      <path d="M4 6 Q28 16 52 6" stroke="#B7F21D" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity={opacity} />
    </svg>
  );
}

/** Hand-drawn lime line — short accent stroke */
export function LimeLine({ width = 40, opacity = 0.65, className = "" }: {
  width?: number; opacity?: number; className?: string;
}) {
  return (
    <svg aria-hidden="true" width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none" className={className} style={{ display: "block" }}>
      <path d={`M2 5 C${width * 0.25} 3, ${width * 0.6} 3.5, ${width - 2} 4.5`} stroke="#B7F21D" strokeWidth="2" strokeLinecap="round" fill="none" opacity={opacity} />
    </svg>
  );
}

/** Speech-bubble speaker label with a tiny left-side tail */
export function SpeechBubbleLabel({ isYou, light = false }: { isYou: boolean; light?: boolean }) {
  const bubbleBg = light
    ? (isYou ? "rgba(183,242,29,0.25)" : "rgba(255,255,255,0.12)")
    : (isYou ? "rgba(183,242,29,0.22)" : "white");
  const bubbleColor = light
    ? (isYou ? "#B7F21D" : "rgba(255,255,255,0.6)")
    : (isYou ? "#184C3A" : "#6A6C66");
  const bubbleBorder = light ? "none" : (isYou ? "none" : "1px solid rgba(0,0,0,0.1)");
  const tailFill = light
    ? (isYou ? "rgba(183,242,29,0.25)" : "rgba(255,255,255,0.12)")
    : (isYou ? "rgba(183,242,29,0.22)" : "white");

  return (
    <div className="relative flex-shrink-0 pt-0.5" style={{ width: "56px" }}>
      {/* Tail — left-pointing, sits just left of the bubble */}
      <svg aria-hidden="true" width="6" height="8" viewBox="0 0 6 8" fill="none"
        className="absolute" style={{ left: "-4px", top: "4px" }}>
        <path d="M6 1 L0 4 L6 7 Z" fill={tailFill} />
      </svg>
      <span className="relative text-[10px] font-black px-2 py-0.5 rounded inline-block"
        style={{ backgroundColor: bubbleBg, color: bubbleColor, border: bubbleBorder }}>
        {isYou ? "YOU" : "STAFF"}
      </span>
    </div>
  );
}

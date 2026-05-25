import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TEAL, CREAM } from "../MainVideo";

const stats = [
  { v: 3, suffix: " countries", label: "Estonia · Latvia · Lithuania" },
  { v: 100, suffix: "%", label: "verified partners" },
  { v: 60, suffix: "s", label: "average booking time" },
];

export const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 120px" }}>
      <div style={{ display: "flex", gap: 96 }}>
        {stats.map((s, i) => {
          const start = i * 14;
          const o = interpolate(frame, [start, start + 18], [0, 1], { extrapolateRight: "clamp" });
          const sp = spring({ frame: frame - start, fps, config: { damping: 20 } });
          const y = interpolate(sp, [0, 1], [40, 0]);
          const t = interpolate(frame, [start + 8, start + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const value = Math.round(s.v * t);
          return (
            <div key={i} style={{ textAlign: "center", opacity: o, transform: `translateY(${y}px)` }}>
              <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 200, color: TEAL, lineHeight: 1, letterSpacing: -6 }}>
                {value}{s.suffix}
              </div>
              <div style={{ marginTop: 18, fontSize: 26, color: "rgba(245,243,238,0.85)" }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TEAL, CREAM } from "../MainVideo";

const items = [
  { t: "Verified partners", d: "Hand-checked Baltic operators only." },
  { t: "Instant booking", d: "Sign and pay online, no callbacks." },
  { t: "Transparent quotes", d: "Clear totals, no hidden fees." },
  { t: "All in one place", d: "Storage, moving, trailers." },
];

export const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headO = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const headY = interpolate(spring({ frame, fps, config: { damping: 20 } }), [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "0 140px" }}>
      <div style={{ opacity: headO, transform: `translateY(${headY}px)` }}>
        <div style={{ fontSize: 22, letterSpacing: 6, textTransform: "uppercase", color: TEAL, fontWeight: 600, marginBottom: 24 }}>
          Why Ruumly
        </div>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 110, fontWeight: 800, color: CREAM, margin: 0, letterSpacing: -2, lineHeight: 1 }}>
          Built for the<br />Baltic market.
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 64, width: "100%", maxWidth: 1400 }}>
        {items.map((it, i) => {
          const start = 24 + i * 12;
          const o = interpolate(frame, [start, start + 18], [0, 1], { extrapolateRight: "clamp" });
          const s = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 130 } });
          const x = interpolate(s, [0, 1], [-40, 0]);
          return (
            <div key={it.t} style={{ opacity: o, transform: `translateX(${x}px)`, padding: 32, background: "rgba(255,255,255,0.06)", borderLeft: `4px solid ${TEAL}`, borderRadius: 16 }}>
              <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 38, color: CREAM, marginBottom: 10 }}>{it.t}</div>
              <div style={{ fontSize: 24, color: "rgba(245,243,238,0.7)", lineHeight: 1.4 }}>{it.d}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
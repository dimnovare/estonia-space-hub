import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TEAL, CREAM } from "../MainVideo";

export const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleY = interpolate(spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 120 } }), [0, 1], [40, 0]);
  const titleO = interpolate(frame, [4, 22], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(spring({ frame: frame - 30, fps, config: { damping: 200 } }), [0, 1], [0, 220]);
  const eyebrowO = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "0 160px" }}>
      <div style={{ opacity: eyebrowO, fontSize: 22, letterSpacing: 6, textTransform: "uppercase", color: TEAL, fontWeight: 600, marginBottom: 28 }}>
        Ruumly · Storage marketplace
      </div>
      <h1
        style={{
          fontFamily: "Manrope, sans-serif",
          fontWeight: 800,
          fontSize: 168,
          lineHeight: 0.95,
          margin: 0,
          color: CREAM,
          transform: `translateY(${titleY}px)`,
          opacity: titleO,
          letterSpacing: -3,
        }}
      >
        Rent storage.<br />
        <span style={{ color: TEAL }}>In 60 seconds.</span>
      </h1>
      <div style={{ width: lineW, height: 4, background: TEAL, marginTop: 36, borderRadius: 4 }} />
    </AbsoluteFill>
  );
};
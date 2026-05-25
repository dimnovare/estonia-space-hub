import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TEAL, CREAM } from "../MainVideo";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoSpring = spring({ frame, fps, config: { damping: 16, stiffness: 110 } });
  const logoO = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const tagO = interpolate(frame, [22, 44], [0, 1], { extrapolateRight: "clamp" });
  const urlO = interpolate(frame, [44, 64], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(spring({ frame: frame - 44, fps, config: { damping: 200 } }), [0, 1], [0, 320]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity: logoO, transform: `scale(${0.85 + logoSpring * 0.15})`, display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ width: 88, height: 88, borderRadius: 22, background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 56, color: "#0E2238" }}>R</div>
        <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 140, color: CREAM, letterSpacing: -3 }}>Ruumly</div>
      </div>
      <div style={{ width: lineW, height: 3, background: TEAL, marginTop: 36, borderRadius: 3 }} />
      <div style={{ opacity: tagO, marginTop: 28, fontSize: 32, color: "rgba(245,243,238,0.85)", letterSpacing: 0.5 }}>
        Storage, simplified.
      </div>
      <div style={{ opacity: urlO, marginTop: 56, fontFamily: "Manrope, sans-serif", fontSize: 36, color: TEAL, fontWeight: 600 }}>
        ruumly.eu
      </div>
    </AbsoluteFill>
  );
};
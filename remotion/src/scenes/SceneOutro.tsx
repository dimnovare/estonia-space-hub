import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TEAL, CREAM } from "../MainVideo";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const iconSpring = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const iconO = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const wordmarkO = interpolate(frame, [28, 52], [0, 1], { extrapolateRight: "clamp" });
  const wordmarkY = interpolate(spring({ frame: frame - 28, fps, config: { damping: 22 } }), [0, 1], [16, 0]);
  const tagO = interpolate(frame, [60, 84], [0, 1], { extrapolateRight: "clamp" });
  const urlO = interpolate(frame, [86, 110], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(spring({ frame: frame - 60, fps, config: { damping: 200 } }), [0, 1], [0, 280]);
  const haloPulse = 0.55 + Math.sin(frame / 22) * 0.12;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Soft teal halo behind the icon */}
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(46,196,182,${0.32 * haloPulse}) 0%, rgba(46,196,182,0.08) 35%, transparent 65%)`,
          filter: "blur(8px)",
          opacity: iconO,
        }}
      />
      <div
        style={{
          opacity: iconO,
          transform: `scale(${0.82 + iconSpring * 0.18})`,
          position: "relative",
        }}
      >
        <Img
          src={staticFile("images/ruumly-icon.png")}
          style={{
            height: 280,
            width: 280,
            display: "block",
            filter: "drop-shadow(0 18px 50px rgba(46,196,182,0.55)) drop-shadow(0 6px 18px rgba(0,0,0,0.45))",
          }}
        />
      </div>
      <div
        style={{
          opacity: wordmarkO,
          transform: `translateY(${wordmarkY}px)`,
          marginTop: 44,
          fontFamily: "Manrope, sans-serif",
          fontWeight: 800,
          fontSize: 96,
          letterSpacing: -2,
          color: CREAM,
          lineHeight: 1,
        }}
      >
        ruumly
      </div>
      <div style={{ width: lineW, height: 3, background: TEAL, marginTop: 28, borderRadius: 3 }} />
      <div
        style={{
          opacity: tagO,
          marginTop: 22,
          fontSize: 28,
          color: "rgba(245,243,238,0.78)",
          letterSpacing: 4,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        Storage, simplified
      </div>
      <div
        style={{
          opacity: urlO,
          marginTop: 44,
          fontFamily: "Manrope, sans-serif",
          fontSize: 32,
          color: TEAL,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        ruumly.eu
      </div>
    </AbsoluteFill>
  );
};
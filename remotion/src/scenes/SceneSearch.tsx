import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TEAL, NAVY, CREAM } from "../MainVideo";

export const SceneSearch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardScale = spring({ frame, fps, config: { damping: 18, stiffness: 130 } });
  const cardO = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const typed = "Tallinn warehouse, 50 m²";
  const chars = Math.floor(interpolate(frame, [20, 70], [0, typed.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const text = typed.slice(0, chars);
  const labelO = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const resultsO = interpolate(frame, [78, 100], [0, 1], { extrapolateRight: "clamp" });
  const resultsY = interpolate(spring({ frame: frame - 78, fps, config: { damping: 20 } }), [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 120px" }}>
      <div style={{ opacity: labelO, fontSize: 22, letterSpacing: 6, textTransform: "uppercase", color: TEAL, fontWeight: 600, marginBottom: 32 }}>
        Search nationwide
      </div>
      <div
        style={{
          width: 1200,
          background: CREAM,
          borderRadius: 24,
          padding: 28,
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
          opacity: cardO,
          transform: `scale(${0.92 + cardScale * 0.08})`,
          display: "flex",
          gap: 20,
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, background: "#EEEAE2", borderRadius: 14, padding: "24px 28px", color: NAVY, fontSize: 32, fontWeight: 500 }}>
          {text}
          <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0 }}>|</span>
        </div>
        <div style={{ background: TEAL, color: "#fff", padding: "26px 44px", borderRadius: 14, fontSize: 28, fontWeight: 600, fontFamily: "Manrope, sans-serif" }}>
          Search
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 48, opacity: resultsO, transform: `translateY(${resultsY}px)` }}>
        {[
          { city: "Tallinn", size: "50 m²", price: "€189" },
          { city: "Tartu", size: "45 m²", price: "€159" },
          { city: "Pärnu", size: "60 m²", price: "€175" },
        ].map((r) => (
          <div key={r.city} style={{ width: 380, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 18, padding: 24, backdropFilter: "blur(4px)" }}>
            <div style={{ height: 140, borderRadius: 12, background: "linear-gradient(135deg, rgba(46,196,182,0.4), rgba(30,58,95,0.6))" }} />
            <div style={{ marginTop: 18, fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 28, color: CREAM }}>{r.city}</div>
            <div style={{ marginTop: 6, color: "rgba(245,243,238,0.7)", fontSize: 20 }}>{r.size} · from <span style={{ color: TEAL, fontWeight: 600 }}>{r.price}</span>/mo</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
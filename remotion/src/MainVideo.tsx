import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, springTiming, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { SceneHero } from "./scenes/SceneHero";
import { SceneSearch } from "./scenes/SceneSearch";
import { SceneFeatures } from "./scenes/SceneFeatures";
import { SceneStats } from "./scenes/SceneStats";
import { SceneOutro } from "./scenes/SceneOutro";

loadManrope("normal", { weights: ["700", "800"], subsets: ["latin"] });
loadDMSans("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

// Brand colors
export const NAVY = "#1E3A5F";
export const NAVY_DARK = "#142845";
export const TEAL = "#2EC4B6";
export const CREAM = "#F5F3EE";

function PersistentBackground() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 60]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 55% at ${75 + Math.sin(frame / 60) * 5}% ${-10 + drift / 10}%, rgba(46,196,182,0.22), transparent 60%), radial-gradient(ellipse 55% 45% at ${5 - Math.cos(frame / 80) * 4}% ${115 - drift / 12}%, rgba(46,196,182,0.14), transparent 55%), linear-gradient(150deg, ${NAVY_DARK} 0%, ${NAVY} 55%, #1b3552 100%)`,
      }}
    />
  );
}

function GrainOverlay() {
  return (
    <AbsoluteFill
      style={{
        opacity: 0.05,
        backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        pointerEvents: "none",
      }}
    />
  );
}

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "DM Sans, sans-serif", color: CREAM }}>
      <PersistentBackground />
      <GrainOverlay />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={160}>
          <SceneHero />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 18 })} />
        <TransitionSeries.Sequence durationInFrames={170}>
          <SceneSearch />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 24 })} />
        <TransitionSeries.Sequence durationInFrames={180}>
          <SceneFeatures />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 18 })} />
        <TransitionSeries.Sequence durationInFrames={160}>
          <SceneStats />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 18 })} />
        <TransitionSeries.Sequence durationInFrames={170}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
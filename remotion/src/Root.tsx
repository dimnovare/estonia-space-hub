import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 18s at 30fps
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={540}
    fps={30}
    width={1920}
    height={1080}
  />
);
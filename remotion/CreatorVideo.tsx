import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { clipFrames, FPS, projectFrames, StudioProject, timelineCaptions } from "../src/lib/studio";
import { resolveMediaSrc } from "./utils";
import { FONTS, waitForFonts } from "./lib/palette";
import { continueRender, delayRender } from "remotion";

export const CreatorVideo: React.FC<{ project: StudioProject }> = ({ project }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [fontHandle] = React.useState(() => delayRender("Load caption font"));
  React.useEffect(() => { waitForFonts().then(() => continueRender(fontHandle)).catch(() => continueRender(fontHandle)); }, [fontHandle]);
  const caption = timelineCaptions(project).find(c => frame >= Math.round(c.start * FPS) && frame < Math.round(c.end * FPS));
  let from = 0;
  const total = projectFrames(project);
  return <AbsoluteFill style={{ backgroundColor: "#09090b", color: "white", fontFamily: FONTS.caption }}>
    {project.clips.map(clip => {
      const asset = project.assets.find(a => a.id === clip.assetId);
      const start = from;
      const duration = clipFrames(clip);
      from += duration;
      return asset ? <Sequence key={clip.id} from={start} durationInFrames={duration}>
        <OffthreadVideo src={resolveMediaSrc(asset.url)} trimBefore={Math.round(clip.in * FPS)} durationInFrames={duration} muted={project.audio === "mute" || !asset.hasAudio} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: clip.position }} />
      </Sequence> : null;
    })}
    {project.headline && frame < Math.min(3 * FPS, total) && <div style={{ position: "absolute", top: 180, left: 70, right: 170, fontSize: 64, lineHeight: 1.3, fontWeight: 600, textShadow: "0 3px 12px rgba(0,0,0,0.9)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{project.headline}</div>}
    {caption && project.captionStyle !== "none" && <div style={{ position: "absolute", bottom: 420, left: 70, right: 170, textAlign: "center" }}>
      <span style={{ display: "inline-block", background: "rgba(9,9,11,0.78)", color: project.captionStyle === "highlight" ? "#fde68a" : "white", borderRadius: 16, padding: "12px 24px", fontSize: 56, fontWeight: 600, lineHeight: 1.4, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{caption.text}</span>
    </div>}
    {project.cta && frame >= Math.max(0, durationInFrames - 2 * FPS) && <div style={{ position: "absolute", bottom: 240, left: 70, right: 170, fontSize: 42, fontWeight: 600, textAlign: "center", textShadow: "0 3px 12px black", overflowWrap: "anywhere" }}>{project.cta}</div>}
  </AbsoluteFill>;
};

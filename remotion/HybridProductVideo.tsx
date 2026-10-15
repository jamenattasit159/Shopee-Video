import React from 'react';
import { AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, useCurrentFrame } from 'remotion';
import { ResolvedScene, ResolvedTimeline } from '../src/lib/workspace/types';
import { resolveMediaSrc } from './utils';
import { FONTS, waitForFonts } from './lib/palette';

const palette={ink:'#15191c',paper:'#f2f1eb',accent:'#d6f274',white:'#ffffff'};
function SceneVisual({scene:s}:{scene:ResolvedScene}){
 const frame=useCurrentFrame(),enter=interpolate(frame,[0,9],[18,0],{extrapolateRight:'clamp'});
 const card=s.layout!=='footage-focus',closing=s.layout==='offer-close';
 const mediaStyle:React.CSSProperties={width:'100%',height:'100%',objectFit:card?'contain':'cover',objectPosition:s.crop};
 const video=(muted:boolean)=><OffthreadVideo src={resolveMediaSrc(s.asset.url)} trimBefore={s.inFrame} muted={muted} volume={s.audioMode==='mix'?0.126:1} style={mediaStyle}/>;
 const sourceMuted=s.audioMode==='narration'||!s.asset.hasAudio;
 return <AbsoluteFill style={{backgroundColor:palette.paper,overflow:'hidden'}}>
   <div style={{position:'absolute',inset:card?'170px 72px 490px 72px':0,borderRadius:card?36:0,overflow:'hidden',backgroundColor:card?palette.white:palette.ink}}>
    {s.asset.kind==='image'?<Img src={resolveMediaSrc(s.asset.url)} style={{...mediaStyle,transform:`scale(${interpolate(frame,[0,s.effectiveDurationFrames],[1,1.035])})`}}/>:<>
      <Sequence durationInFrames={Math.min(s.durationFrames,s.effectiveDurationFrames)} layout="none">{video(sourceMuted)}</Sequence>
      {s.effectiveDurationFrames>s.durationFrames&&<Sequence from={s.durationFrames} durationInFrames={s.effectiveDurationFrames-s.durationFrames} layout="none"><Freeze frame={s.durationFrames-1}>{video(true)}</Freeze></Sequence>}
    </>}
   </div>
   {!card&&s.overlayText&&<div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.55),transparent 38%)'}}/>}
   {s.overlayText&&<div style={{position:'absolute',left:72,right:150,top:card?closing?1200:1180:180,transform:`translateY(${enter}px)`,color:card?palette.ink:palette.white}}>
     <div style={{width:64,height:7,backgroundColor:palette.accent,marginBottom:24}}/>
     <div style={{fontSize:closing?92:64,lineHeight:1.25,fontWeight:600,whiteSpace:'pre-wrap',overflowWrap:'anywhere',textShadow:card?'none':'0 2px 18px rgba(0,0,0,.5)'}}>{s.overlayText}</div>
   </div>}
   {s.narration&&s.audioMode!=='original'&&<Audio src={resolveMediaSrc(s.narration.url)}/>}
 </AbsoluteFill>;
}
export function HybridProductVideo({timeline}:{timeline:ResolvedTimeline}){
 const frame=useCurrentFrame();const [handle]=React.useState(()=>delayRender('Load Thai fonts'));
 React.useEffect(()=>{waitForFonts().then(()=>continueRender(handle)).catch(()=>continueRender(handle));},[handle]);
 const cue=timeline.captions.find(c=>frame>=c.startFrame&&frame<c.endFrame);
 return <AbsoluteFill style={{backgroundColor:palette.ink,fontFamily:FONTS.caption}}>
   {timeline.scenes.map(s=><Sequence key={s.id} from={s.fromFrame} durationInFrames={s.effectiveDurationFrames}><SceneVisual scene={timeline.legacyAudio?{...s,audioMode:'narration',narration:undefined}:s}/></Sequence>)}
   {timeline.legacyAudio&&<Audio src={resolveMediaSrc(timeline.legacyAudio.url)}/>}
   {cue&&timeline.captionStyle!=='none'&&<div style={{position:'absolute',left:72,right:150,bottom:320,textAlign:'center'}}><span style={{display:'inline-block',maxWidth:'100%',fontSize:54,fontWeight:600,lineHeight:1.4,padding:'12px 24px',borderRadius:14,backgroundColor:timeline.captionStyle==='highlight'?palette.accent:palette.ink,color:timeline.captionStyle==='highlight'?palette.ink:palette.white,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{cue.text}</span></div>}
 </AbsoluteFill>;
}

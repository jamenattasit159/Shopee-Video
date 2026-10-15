import { NarrationArtifact, PreparedSpeech, Scene, VoiceSelection } from './types';
// A canonical content key, compared exactly on both client and server. Server SHA-256s it for filenames.
export function narrationHash(scene:Scene,voice:VoiceSelection,speech:PreparedSpeech){return JSON.stringify({version:1,text:scene.displayText,spoken:speech.textForSpeech,tokens:speech.tokens,voice});}
export function canApplyNarration(currentHash:string,result:NarrationArtifact){return currentHash===result.inputHash;}

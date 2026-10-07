import React from "react";
import { PackId, TempoType, TransitionType } from "../types";

export interface PackDefinition {
  id: PackId;
  name: string;
  concept: string;
  tempo: TempoType;
  holdFrames: number; // 2 for hyper, 3 for snappy, 4 for chill
  defaultBg: string;
  preferredTransitions: TransitionType[];
  renderBackground: (opts?: { bg?: string; overlayOpacity?: number }) => React.ReactNode;
  renderBadge?: (text: string, color?: string) => React.ReactNode;
}

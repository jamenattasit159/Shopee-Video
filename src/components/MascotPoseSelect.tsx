"use client";

import React from "react";
import { isMascotPose, MASCOT_POSE_LABELS, type MascotAnimation, type MascotPose } from "../../remotion/lib/mascotAnimation";

/** Distinct poses found in an analysed mascot, in first-seen order. */
export function availableMascotPoses(animation?: MascotAnimation): MascotPose[] {
  return [...new Set((animation?.poses || []).map((clip) => clip.pose))];
}

export function MascotPoseSelect({ id, value, poses, onChange }: {
  id: string;
  value?: MascotPose;
  poses: MascotPose[];
  onChange: (pose: MascotPose | undefined) => void;
}) {
  if (!poses.length) return null;
  const missing = value && !poses.includes(value);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-base-content/80">ท่ามาสคอต</label>
      <select
        id={id}
        value={value || ""}
        onChange={(e) => onChange(isMascotPose(e.target.value) ? e.target.value : undefined)}
        className="select select-bordered select-sm w-full rounded-xl bg-base-100 text-xs"
        aria-describedby={`${id}-help`}
      >
        <option value="">อัตโนมัติ (เลือกให้เข้ากับฉาก)</option>
        {poses.map((pose) => <option key={pose} value={pose}>{MASCOT_POSE_LABELS[pose]}</option>)}
        {missing && <option value={value}>{MASCOT_POSE_LABELS[value]} (ไม่มีในมาสคอตนี้)</option>}
      </select>
      <p id={`${id}-help`} className="text-xs text-base-content/60">
        {missing ? "มาสคอตไม่มีท่านี้ ระบบจะใช้ท่าใกล้เคียงแทน" : "มาสคอตจะค้างท่านี้ตลอดฉาก พร้อมขอบกระดาษตัดขยับ"}
      </p>
    </div>
  );
}

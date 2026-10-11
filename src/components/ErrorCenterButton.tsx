"use client";

import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getErrorState, setDrawerOpen, subscribeErrorStore } from "@/lib/errorStore";

export const ErrorCenterButton: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    setUnreadCount(getErrorState().unreadCount);
    const unsubscribe = subscribeErrorStore(() => {
      setUnreadCount(getErrorState().unreadCount);
    });
    return unsubscribe;
  }, []);

  return (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="btn btn-ghost btn-sm btn-circle relative"
      title="เปิดศูนย์รายงานข้อผิดพลาด"
      aria-label="เปิดศูนย์รายงานข้อผิดพลาด"
    >
      <Bell className="w-4 h-4 text-base-content/80" />
      {unreadCount > 0 && (
        <span className="badge badge-error badge-xs absolute -top-1 -right-1 text-[10px] font-bold text-white px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

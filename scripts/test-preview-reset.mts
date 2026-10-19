import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoPlayerPreview } from "../src/components/VideoPlayerPreview";
import { defaultShopeeVideoProps } from "../remotion/ShopeeProductVideo";
import { RenderExportModal } from "../src/components/RenderExportModal";

test("saved MP4 preview waits for Play when restored or replaced", () => {
  for (const url of ["/renders/saved.mp4", "/renders/new.mp4"]) {
    const html = renderToStaticMarkup(React.createElement(RenderExportModal, {
      videoProps: defaultShopeeVideoProps,
      initialVideoUrl: url,
    }));
    const video = html.match(/<video\b[^>]*>/)?.[0];
    assert.ok(video, "Saved output must remain available to preview");
    assert.ok(video.includes(url));
    assert.match(video, /\bcontrols=""/);
    assert.match(video, /\bpreload="metadata"/);
    assert.doesNotMatch(video, /\bautoplay\b/i);
  }
});

test("new clip has an idle preview with no player or media to play", () => {
  const html = renderToStaticMarkup(React.createElement(VideoPlayerPreview, {
    props: { ...defaultShopeeVideoProps, voiceoverUrl: "/previous-voice.mp3" },
    enabled: false,
  }));
  assert.ok(html.includes("พรีวิวพร้อมเมื่อสร้างสินค้าใหม่"));
  assert.ok(html.includes("รอสร้างคลิปใหม่"));
  assert.ok(!html.includes("กำลังตรวจช่วงคลิป"));
  assert.ok(!html.includes("previous-voice.mp3"));
  assert.doesNotMatch(html, /<(?:audio|video)\b/);
});

test("existing product still prepares its preview", () => {
  const html = renderToStaticMarkup(React.createElement(VideoPlayerPreview, {
    props: defaultShopeeVideoProps,
    enabled: true,
  }));
  assert.ok(html.includes("กำลังตรวจช่วงคลิปและจัดเวลาซับจากเสียง"));
  assert.ok(!html.includes("พรีวิวพร้อมเมื่อสร้างสินค้าใหม่"));
});

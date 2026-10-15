import { NextRequest, NextResponse } from 'next/server';
import { prepareVideoProps } from '../../../lib/videoPreparation';
import { buildVideoTimeline } from '../../../../remotion/lib/videoTimeline';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const { props } = await request.json();
    if (!props?.images?.length) return NextResponse.json({ error: 'กรุณาเพิ่มสื่อสินค้า' }, { status: 400 });
    const prepared = await prepareVideoProps(props);
    return NextResponse.json({ props: prepared, durationInFrames: buildVideoTimeline(prepared).durationInFrames });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'เตรียมวิดีโอไม่สำเร็จ' }, { status: 422 });
  }
}

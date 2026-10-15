"""Synthesize a selected voice without cross-voice fallback; retain real speech boundaries."""
import asyncio, json, sys
import edge_tts
async def main():
    with open(sys.argv[1], encoding='utf-8') as f: data=json.load(f)
    events=[]
    tts=edge_tts.Communicate(data['text'], data['voice'], rate=data['rate'], pitch=data.get('pitch', '+0Hz'), boundary='WordBoundary')
    with open(sys.argv[2], 'wb') as audio:
        async for chunk in tts.stream():
            if chunk['type']=='audio': audio.write(chunk['data'])
            elif chunk['type']=='WordBoundary': events.append({'text':chunk['text'],'start':chunk['offset']/10000000,'end':(chunk['offset']+chunk['duration'])/10000000})
    with open(sys.argv[3], 'w', encoding='utf-8') as f: json.dump(events, f, ensure_ascii=False)
asyncio.run(main())

#!/usr/bin/env python3
"""
YouTube 채널의 모든 영상 자막 추출 (youtube-transcript-api v1.x)
"""
import json
import os
import time
from youtube_transcript_api import YouTubeTranscriptApi

# 영상 목록 로드
with open('reference/ear_opening_english_list.json', 'r', encoding='utf-8') as f:
    videos = json.load(f)

output_dir = 'reference/subtitles'
os.makedirs(output_dir, exist_ok=True)

success_count = 0
fail_count = 0
failed_videos = []

ytt_api = YouTubeTranscriptApi()

for i, video in enumerate(videos):
    video_id = video['id']
    title = video['title']
    output_path = os.path.join(output_dir, f"{video_id}.json")
    
    # 이미 추출된 경우 스킵
    if os.path.exists(output_path):
        print(f"[{i+1}/{len(videos)}] ⏭️ Skip (exists): {title[:30]}...")
        success_count += 1
        continue
    
    try:
        # 자막 목록 가져오기
        transcript_list = ytt_api.list(video_id)
        
        # 한국어 또는 영어 자막 찾기
        try:
            transcript = transcript_list.find_generated_transcript(['ko', 'en'])
        except:
            try:
                transcript = transcript_list.find_manually_created_transcript(['ko', 'en'])
            except:
                # 아무 자막이나
                transcript = None
                for t in transcript_list:
                    transcript = t
                    break
        
        if transcript:
            # fetch()로 자막 데이터 가져오기
            fetched = transcript.fetch()
            
            # to_raw_data()로 JSON 직렬화 가능한 형태로 변환
            transcript_data = fetched.to_raw_data()
            
            # 저장
            result = {
                'video_id': video_id,
                'title': title,
                'url': video['url'],
                'language': transcript.language_code,
                'transcript': transcript_data
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            print(f"[{i+1}/{len(videos)}] ✅ {title[:40]}...")
            success_count += 1
        else:
            print(f"[{i+1}/{len(videos)}] ❌ No subtitles: {title[:30]}...")
            failed_videos.append({'id': video_id, 'title': title, 'error': 'No transcript found'})
            fail_count += 1
        
        # Rate limit 방지
        time.sleep(0.5)
        
    except Exception as e:
        print(f"[{i+1}/{len(videos)}] ❌ Error: {title[:30]}... - {e}")
        failed_videos.append({'id': video_id, 'title': title, 'error': str(e)})
        fail_count += 1
        time.sleep(1)

print(f"\n📊 완료: {success_count} 성공, {fail_count} 실패")

# 실패 목록 저장
if failed_videos:
    with open('reference/failed_subtitles.json', 'w', encoding='utf-8') as f:
        json.dump(failed_videos, f, ensure_ascii=False, indent=2)
    print(f"❌ 실패 목록: reference/failed_subtitles.json")

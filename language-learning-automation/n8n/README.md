# n8n YouTube 자동 업로드 설정

## 사전 준비

### 1. Google Drive 폴더 구조 생성

```
YouTube-Queue/
├── 대기중/
│   ├── english/
│   └── english_korean/
└── 완료/
    ├── english/
    └── english_korean/
```

### 2. YouTube Data API 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. YouTube Data API v3 활성화
4. OAuth 2.0 클라이언트 ID 생성 (데스크톱 앱)
5. 클라이언트 ID와 시크릿 저장

### 3. n8n Credentials 설정

#### Google Drive

1. n8n > Credentials > Add Credential > Google Drive OAuth2
2. Client ID, Client Secret 입력
3. 연결 테스트

#### YouTube

1. n8n > Credentials > Add Credential > YouTube OAuth2
2. Client ID, Client Secret 입력
3. Scopes: `https://www.googleapis.com/auth/youtube.upload`
4. 연결 테스트

## 워크플로우 설정

### 1. 워크플로우 가져오기

1. n8n > Workflows > Import from File
2. `youtube-upload-workflow.json` 선택

### 2. 폴더 ID 설정

워크플로우에서 다음 값들을 실제 폴더 ID로 변경:

- `YOUR_PENDING_FOLDER_ID` → 대기중 폴더 ID
- `YOUR_COMPLETED_FOLDER_ID` → 완료 폴더 ID

폴더 ID 찾는 법: Google Drive에서 폴더 열고 URL에서 확인
`https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### 3. Credential ID 설정

각 노드에서 실제 credential 선택

### 4. 스케줄 설정

기본값: 매일 오후 6시 (KST)
변경하려면 "매일 오후 6시" 노드 수정

## 사용법

### 1. 영상 생성

```bash
npx tsx src/pipeline/cli.ts --channel english --render
```

### 2. 업로드 준비

```bash
npx tsx scripts/prepare-upload.ts --channel english
```

### 3. Google Drive에 업로드

생성된 3개 파일을 `대기중/english/` 폴더에 복사:

- `{날짜}_{주제}.mp4`
- `{날짜}_{주제}_thumb.png`
- `{날짜}_{주제}_info.json`

### 4. 자동 업로드

n8n이 매일 정해진 시간에:

1. 대기중 폴더에서 가장 오래된 \_info.json 찾기
2. 해당 영상 + 썸네일 YouTube에 업로드
3. 완료 폴더로 이동

## info.json 형식

```json
{
  "title": "영상 제목",
  "description": "영상 설명",
  "tags": ["태그1", "태그2"],
  "language": "ko",
  "privacyStatus": "public",
  "channelId": "english",
  "category": "conversation",
  "topic": "주제"
}
```

## 트러블슈팅

### 업로드 실패 시

1. n8n Executions에서 에러 확인
2. YouTube API 할당량 확인 (일일 10,000 units)
3. OAuth 토큰 만료 시 재인증

### 파일을 못 찾을 때

- 파일명이 정확히 일치하는지 확인
- `_info.json`, `.mp4`, `_thumb.png` 접미사 확인

# Google Trends 동적 주제 선정 스펙

## 개요

실시간 트렌드 데이터를 활용해 학습자가 관심 가질 만한 시의성 있는 주제를 자동 선정

## 접근 방식 비교

### Option 1: Google Trends API (비공식)

```
npm install google-trends-api
```

**장점:**

- 무료, API 키 불필요
- 실시간 트렌드, 관련 검색어, 지역별 데이터

**단점:**

- 비공식 API (언제든 막힐 수 있음)
- Rate limit 존재
- 불안정할 수 있음

**사용 예시:**

```typescript
import googleTrends from 'google-trends-api';

// 한국에서 뜨는 검색어
const trending = await googleTrends.dailyTrends({ geo: 'KR' });

// 특정 키워드 관련 검색어
const related = await googleTrends.relatedQueries({
  keyword: 'K-pop',
  geo: 'US',
});
```

---

### Option 2: SerpAPI (Google Trends)

```
npm install serpapi
```

**장점:**

- 안정적인 공식 API
- Google Trends 데이터 정확히 제공
- 다양한 파라미터 지원

**단점:**

- 유료 (월 100회 무료)
- API 키 필요

---

### Option 3: 웹 스크래핑 + 캐싱

Puppeteer로 Google Trends 페이지 직접 스크래핑

**장점:**

- 무료, 제한 없음

**단점:**

- 유지보수 어려움
- Google 정책 위반 가능성
- 느림

---

### Option 4: 하이브리드 (추천)

1. **기본**: 하드코딩된 문화적 관심사 DB (현재 구현)
2. **보조**: Google Trends API로 실시간 트렌드 보강
3. **캐싱**: 트렌드 데이터 24시간 캐싱

## 추천 구현 방안

### 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                  Topic Selector                      │
├─────────────────────────────────────────────────────┤
│  1. Cultural Interests DB (하드코딩)                 │
│     └─ 기본 카테고리 + 상황 예시                     │
│                                                      │
│  2. Trend Enhancer (선택적)                          │
│     └─ Google Trends API                            │
│     └─ 24시간 캐싱                                   │
│     └─ 실패 시 graceful fallback                    │
│                                                      │
│  3. AI Topic Generator (Gemini)                     │
│     └─ 문화 컨텍스트 + 트렌드 힌트 → 최종 주제      │
└─────────────────────────────────────────────────────┘
```

### 데이터 흐름

```
1. 트렌드 캐시 확인 (24시간 이내?)
   ├─ Yes → 캐시된 트렌드 사용
   └─ No → Google Trends API 호출
           ├─ 성공 → 캐시 업데이트
           └─ 실패 → 하드코딩 DB만 사용

2. 문화적 관심사 + 트렌드 결합
   └─ 프롬프트에 "최근 트렌드: BTS 컴백, 설날" 추가

3. Gemini가 최종 주제 생성
```

### 파일 구조

```
src/script/
├── cultural-interests.ts    # 하드코딩 DB (현재)
├── trend-fetcher.ts         # Google Trends API 래퍼 (신규)
├── trend-cache.ts           # 트렌드 캐싱 (신규)
└── topic-selector.ts        # 통합 (수정)
```

### trend-fetcher.ts 예시

```typescript
import googleTrends from 'google-trends-api';

interface TrendData {
  keyword: string;
  relatedTopics: string[];
  fetchedAt: string;
}

const COUNTRY_CODES: Record<string, string> = {
  Korean: 'KR',
  English: 'US',
  Japanese: 'JP',
  Chinese: 'CN',
  Spanish: 'ES',
};

export async function fetchTrendingTopics(targetLanguage: string): Promise<TrendData[]> {
  const geo = COUNTRY_CODES[targetLanguage] || 'US';

  try {
    const result = await googleTrends.dailyTrends({ geo });
    const data = JSON.parse(result);

    return data.default.trendingSearchesDays[0].trendingSearches.slice(0, 5).map((item: any) => ({
      keyword: item.title.query,
      relatedTopics: item.relatedQueries || [],
      fetchedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('Google Trends API failed, using fallback');
    return [];
  }
}
```

### 캐싱 전략

```typescript
// output/trend-cache.json
{
  "Korean": {
    "trends": ["BTS 컴백", "설날 음식", "올림픽"],
    "fetchedAt": "2026-01-09T10:00:00Z",
    "expiresAt": "2026-01-10T10:00:00Z"
  },
  "English": {
    "trends": ["Super Bowl", "Oscar nominations", "Taylor Swift"],
    "fetchedAt": "2026-01-09T10:00:00Z",
    "expiresAt": "2026-01-10T10:00:00Z"
  }
}
```

## 구현 우선순위

### Phase 1 (현재 완료)

- [x] 문화적 관심사 하드코딩 DB
- [x] topic-selector에 통합

### Phase 2 (다음 단계)

- [ ] google-trends-api 패키지 설치
- [ ] trend-fetcher.ts 구현
- [ ] 24시간 캐싱 로직
- [ ] topic-selector에 트렌드 힌트 추가

### Phase 3 (선택적)

- [ ] 여러 트렌드 소스 통합 (Reddit, Twitter)
- [ ] 트렌드 필터링 (언어 학습에 적합한 것만)
- [ ] A/B 테스트 (트렌드 vs 하드코딩 성과 비교)

## 예상 결과

### Before (현재)

```
프롬프트: "K-POP/엔터테인먼트 관련 주제를 고려해줘"
결과: "아이돌 팬사인회에서 인사하기"
```

### After (트렌드 적용)

```
프롬프트: "K-POP/엔터테인먼트 관련 주제를 고려해줘.
         최근 트렌드: BTS 컴백, 뉴진스 신곡"
결과: "BTS 콘서트 티켓 예매하기" (더 시의성 있음)
```

## 리스크 & 대응

| 리스크                           | 대응                               |
| -------------------------------- | ---------------------------------- |
| Google Trends API 불안정         | Graceful fallback to 하드코딩 DB   |
| Rate limit 초과                  | 24시간 캐싱으로 호출 최소화        |
| 부적절한 트렌드 (정치, 사건사고) | AI 필터링 + 블랙리스트             |
| 트렌드가 언어학습과 무관         | 문화 카테고리와 매칭되는 것만 사용 |

## 결론

**추천: Phase 2까지만 구현**

- google-trends-api (무료)로 시작
- 실패해도 현재 하드코딩 DB가 백업
- 복잡한 스크래핑이나 유료 API는 나중에 필요하면 추가

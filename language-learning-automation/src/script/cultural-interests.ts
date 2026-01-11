/**
 * 문화권별 관심사 데이터베이스
 * 학습자가 타겟 언어 문화권에서 관심 가질 만한 주제들
 */

export interface CulturalCategory {
  category: string;
  situations: string[];
}

/**
 * 타겟 언어별 문화적 관심사
 * Key: targetLanguage (배우려는 언어)
 */
export const CULTURAL_INTERESTS: Record<string, CulturalCategory[]> = {
  Korean: [
    {
      category: 'K-POP/엔터테인먼트',
      situations: [
        '팬사인회에서 아이돌에게 인사하기',
        'K-POP 콘서트 티켓 예매하기',
        '음악방송 사전녹화 줄 서면서 대화하기',
        '아이돌 굿즈샵에서 쇼핑하기',
        '한국 드라마 명대사 따라하기',
        '연예인 팬미팅에서 질문하기',
        '뮤직비디오 촬영지 찾아가기',
      ],
    },
    {
      category: '맛집/카페',
      situations: [
        '홍대 맛집에서 웨이팅 걸기',
        '한국 편의점에서 삼각김밥 고르기',
        '포장마차에서 떡볶이 주문하기',
        '카페에서 아메리카노 사이즈 고르기',
        '배달앱으로 치킨 주문하기',
        '고깃집에서 삼겹살 굽는 법 물어보기',
        '분식집에서 라면 추가하기',
        '전통시장에서 호떡 사먹기',
      ],
    },
    {
      category: '여행/관광',
      situations: [
        '명동에서 길 물어보기',
        '지하철에서 환승하는 법 묻기',
        '한옥마을에서 한복 대여하기',
        '찜질방 이용법 물어보기',
        '택시에서 목적지 설명하기',
        '경복궁에서 가이드 투어 신청하기',
        'DMZ 투어 예약하기',
        '부산 해운대에서 서핑 배우기',
      ],
    },
    {
      category: '쇼핑',
      situations: [
        '동대문에서 옷 가격 흥정하기',
        '올리브영에서 화장품 추천받기',
        '면세점에서 선물 고르기',
        '백화점에서 세일 정보 물어보기',
        '마트에서 한국 과자 고르기',
      ],
    },
    {
      category: '일상생활',
      situations: [
        '한국 친구 집에 초대받았을 때',
        '노래방에서 노래 선곡하기',
        'PC방에서 게임하기',
        '한국어 학원 등록하기',
        '휴대폰 유심 구매하기',
      ],
    },
  ],

  English: [
    {
      category: '해외여행',
      situations: [
        '공항 입국심사 통과하기',
        'In-N-Out에서 시크릿 메뉴 주문하기',
        '뉴욕 타임스퀘어에서 길 찾기',
        '에어비앤비 호스트에게 체크인 문의하기',
        '렌터카 픽업할 때 옵션 선택하기',
        '그랜드캐니언 투어 예약하기',
        'LA 유니버셜 스튜디오 티켓 구매하기',
        '라스베가스 호텔 체크인하기',
      ],
    },
    {
      category: '비즈니스/커리어',
      situations: [
        '영어 면접에서 자기소개하기',
        '화상회의에서 의견 말하기',
        '이메일로 미팅 일정 잡기',
        '컨퍼런스에서 네트워킹하기',
        '프레젠테이션 시작하기',
        '동료에게 도움 요청하기',
      ],
    },
    {
      category: '미국 문화체험',
      situations: [
        'NBA 경기 티켓 구매하기',
        '브로드웨이 뮤지컬 예매하기',
        '스타벅스에서 커스텀 음료 주문하기',
        '팁 계산하고 결제하기',
        '슈퍼볼 파티에 초대받았을 때',
        '할로윈 파티 의상 고르기',
        '추수감사절 디너 초대받았을 때',
      ],
    },
    {
      category: '일상생활',
      situations: [
        '미국 마트에서 장보기',
        '약국에서 감기약 사기',
        '은행 계좌 개설하기',
        '우버 타고 목적지 가기',
        '미용실에서 헤어스타일 설명하기',
        '이웃에게 인사하기',
      ],
    },
    {
      category: '유학/어학연수',
      situations: [
        '대학교 캠퍼스 투어하기',
        '기숙사 룸메이트와 대화하기',
        '교수님 오피스아워 방문하기',
        '도서관에서 책 대출하기',
        '학교 동아리 가입하기',
      ],
    },
  ],

  Japanese: [
    {
      category: '애니메이션/만화',
      situations: [
        '아키하바라에서 피규어 구매하기',
        '만화카페에서 이용법 물어보기',
        '코믹마켓에서 동인지 사기',
        '성우 이벤트 티켓 구매하기',
        '지브리 미술관 예약하기',
        '애니메이션 성지순례 가기',
      ],
    },
    {
      category: '여행/관광',
      situations: [
        '료칸에서 체크인하기',
        '이자카야에서 주문하기',
        '온천 이용 에티켓 물어보기',
        '신칸센 티켓 구매하기',
        '교토 기모노 체험하기',
        '오사카 도톤보리에서 타코야키 먹기',
        '후지산 등반 투어 신청하기',
      ],
    },
    {
      category: '맛집/음식',
      situations: [
        '라멘집에서 면 굵기 선택하기',
        '스시집에서 오마카세 주문하기',
        '편의점에서 도시락 고르기',
        '이자카야에서 음료 리필하기',
        '야키토리집에서 꼬치 주문하기',
      ],
    },
    {
      category: '쇼핑',
      situations: [
        '돈키호테에서 쇼핑하기',
        '유니클로에서 사이즈 물어보기',
        '면세 수속하기',
        '백화점 지하 식품관에서 선물 고르기',
      ],
    },
    {
      category: '일상생활',
      situations: [
        '일본어 학원 등록하기',
        '일본 친구 집에 초대받았을 때',
        '가라오케에서 노래 부르기',
        '게임센터에서 UFO캐처 하기',
      ],
    },
  ],

  Chinese: [
    {
      category: '여행/관광',
      situations: [
        '만리장성 투어 예약하기',
        '상하이 외탄에서 야경 보기',
        '베이징 자금성 가이드 투어하기',
        '청두에서 판다 보러 가기',
        '시안 병마용 관람하기',
        '구이린 유람선 타기',
      ],
    },
    {
      category: '맛집/음식',
      situations: [
        '훠궈집에서 육수 선택하기',
        '딤섬 레스토랑에서 주문하기',
        '베이징덕 레스토랑 예약하기',
        '길거리에서 꼬치 사먹기',
        '차 전문점에서 차 고르기',
      ],
    },
    {
      category: '쇼핑',
      situations: [
        '타오바오로 쇼핑하기',
        '시장에서 가격 흥정하기',
        '위챗페이로 결제하기',
        '면세점에서 쇼핑하기',
      ],
    },
    {
      category: '비즈니스',
      situations: [
        '중국 바이어와 미팅하기',
        '명함 교환 예절',
        '비즈니스 만찬에서 건배하기',
        '공장 견학하기',
      ],
    },
    {
      category: '일상생활',
      situations: [
        '디디추싱으로 택시 부르기',
        '중국 친구와 위챗으로 대화하기',
        '중국어 학원 등록하기',
        'KTV에서 노래 부르기',
      ],
    },
  ],

  Spanish: [
    {
      category: '여행/관광',
      situations: [
        '바르셀로나 사그라다 파밀리아 관람하기',
        '마드리드 프라도 미술관 가기',
        '플라멩코 공연 예약하기',
        '멕시코 칸쿤 리조트 체크인하기',
        '마추픽추 투어 예약하기',
        '쿠바 아바나 올드카 투어하기',
      ],
    },
    {
      category: '맛집/음식',
      situations: [
        '타파스 바에서 주문하기',
        '멕시코 타코 가게에서 주문하기',
        '상그리아 주문하기',
        '파에야 레스토랑 예약하기',
        '츄러스 카페에서 주문하기',
      ],
    },
    {
      category: '축제/문화',
      situations: [
        '라 토마티나 축제 참가하기',
        '산 페르민 축제 구경하기',
        '멕시코 죽은 자의 날 체험하기',
        '축구 경기 티켓 구매하기',
      ],
    },
    {
      category: '일상생활',
      situations: [
        '스페인어 학원 등록하기',
        '현지 친구와 대화하기',
        '시에스타 문화 이해하기',
        '현지 마트에서 장보기',
      ],
    },
  ],
};

/**
 * 랜덤으로 문화 카테고리 선택
 */
export function getRandomCulturalCategory(targetLanguage: string): CulturalCategory | null {
  const interests = CULTURAL_INTERESTS[targetLanguage];
  if (!interests || interests.length === 0) return null;
  return interests[Math.floor(Math.random() * interests.length)];
}

/**
 * 특정 카테고리에서 랜덤 상황 선택
 */
export function getRandomSituation(targetLanguage: string, categoryName?: string): string | null {
  const interests = CULTURAL_INTERESTS[targetLanguage];
  if (!interests || interests.length === 0) return null;

  let category: CulturalCategory;
  if (categoryName) {
    const found = interests.find((c) => c.category === categoryName);
    if (!found) return null;
    category = found;
  } else {
    category = interests[Math.floor(Math.random() * interests.length)];
  }

  return category.situations[Math.floor(Math.random() * category.situations.length)];
}

/**
 * 문화적 컨텍스트 프롬프트 생성
 */
export function buildCulturalContextPrompt(targetLanguage: string, nativeLanguage: string): string {
  const category = getRandomCulturalCategory(targetLanguage);
  if (!category) {
    return '';
  }

  const exampleSituations = category.situations.slice(0, 5).join(', ');

  return `
# 문화적 관심사 컨텍스트
${nativeLanguage} 화자가 ${targetLanguage}를 배우는 주요 이유 중 하나:
- 관심 카테고리: ${category.category}
- 관련 상황 예시: ${exampleSituations}

이 문화적 맥락을 고려해서, 학습자가 실제로 사용할 가능성이 높은 상황을 제안해줘.
단, 너무 복잡하지 않고 초중급자가 소화할 수 있는 수준이어야 해.`;
}

/**
 * 이미지 생성용 스타일 프롬프트 모음 (Updated)
 * - 카테고리 필드 추가
 * - 최신 트렌드 스타일 추가 (Cyberpunk, Steampunk, Lo-fi 등)
 */

export type StyleCategory =
  | 'illustration'
  | 'painting'
  | 'digital'
  | 'retro'
  | 'fantasy'
  | 'realistic'
  | 'asian'
  | 'urban';

export interface ImageStyle {
  id: string;
  name: string;
  category: StyleCategory; // 필터링을 위한 카테고리 추가
  prompt: string;
}

export const IMAGE_STYLES: ImageStyle[] = [
  // === 일러스트/만화 (Illustration) ===
  {
    id: 'ghibli',
    name: 'Studio Ghibli',
    category: 'illustration',
    prompt: `Studio Ghibli anime style, hand-painted watercolor backgrounds, soft pastel colors, whimsical and dreamlike atmosphere, detailed nature elements, warm nostalgic lighting.`,
  },
  {
    id: 'anime_modern',
    name: 'Modern Anime',
    category: 'illustration',
    prompt: `Modern anime style, clean line art, vibrant colors, dynamic composition, detailed character expressions, soft cel shading, atmospheric lighting effects.`,
  },
  {
    id: 'demon_slayer',
    name: 'Demon Slayer',
    category: 'illustration',
    prompt: `Demon Slayer (Kimetsu no Yaiba) anime style by ufotable, dramatic action poses, flowing water/flame breathing effects, traditional Japanese aesthetic mixed with dynamic animation, bold color contrasts, intricate patterns on clothing, cinematic lighting with glowing effects.`,
  },
  {
    id: 'pixar_3d',
    name: 'Pixar 3D',
    category: 'illustration',
    prompt: `High-quality 3D animation style, reminiscent of Pixar or Disney movies. Photorealistic rendering with stylized characters. Cute but mature characters with highly expressive facial features and large, detailed eyes. Cinematic lighting with volumetric lighting effects, subsurface scattering for realistic skin glow. Rich, vibrant textures with attention to material details.`,
  },
  {
    id: 'clay_animation',
    name: 'Clay Animation',
    category: 'illustration',
    prompt: `3D clay animation style, stop motion aesthetic, plasticine clay texture, handmade feel, soft studio lighting, playful atmosphere, cute and friendly character proportions, high quality 4K render.`,
  },
  {
    id: 'webtoon',
    name: 'Webtoon/Manhwa',
    category: 'illustration',
    prompt: `Korean webtoon style, clean digital art, soft gradients, romantic atmosphere, beautiful character designs, pastel color palette, dreamy lighting.`,
  },
  {
    id: 'comic_american',
    name: 'American Comic',
    category: 'illustration',
    prompt: `American comic book style, bold ink lines, dynamic poses, dramatic shadows, halftone dots, vibrant primary colors, action-packed composition.`,
  },
  {
    id: 'comic_european',
    name: 'European BD',
    category: 'illustration',
    prompt: `European bande dessinée style (Tintin, Asterix), clear ligne claire technique, flat colors, detailed backgrounds, clean outlines, classic illustration feel.`,
  },

  // === 회화/아트 (Painting) ===
  {
    id: 'watercolor',
    name: 'Watercolor',
    category: 'painting',
    prompt: `Delicate watercolor painting style, soft color bleeds, visible brush strokes, paper texture, gentle gradients, dreamy and ethereal atmosphere.`,
  },
  {
    id: 'oil_painting',
    name: 'Oil Painting',
    category: 'painting',
    prompt: `Classical oil painting style, rich impasto texture, warm golden lighting, Renaissance-inspired composition, deep shadows, luminous highlights.`,
  },
  {
    id: 'impressionist',
    name: 'Impressionist',
    category: 'painting',
    prompt: `Impressionist painting style (Monet, Renoir), visible brushstrokes, dappled light effects, soft focus, vibrant color palette, outdoor scenes.`,
  },
  {
    id: 'art_nouveau',
    name: 'Art Nouveau',
    category: 'painting',
    prompt: `Art Nouveau style (Mucha), flowing organic lines, decorative borders, elegant female figures, floral motifs, muted earth tones with gold accents.`,
  },

  // === 디지털/모던 (Digital) ===
  {
    id: 'flat_design',
    name: 'Flat Design',
    category: 'digital',
    prompt: `Modern flat design illustration, geometric shapes, bold solid colors, minimal shadows, clean vector style, simple and friendly characters.`,
  },
  {
    id: 'isometric',
    name: 'Isometric 3D',
    category: 'digital',
    prompt: `Isometric illustration style, 3D perspective without vanishing points, clean geometric shapes, vibrant colors, detailed miniature world feel.`,
  },
  {
    id: 'low_poly',
    name: 'Low Poly',
    category: 'digital',
    prompt: `Low poly 3D art style, geometric faceted surfaces, gradient colors, modern minimalist aesthetic, soft lighting, crystalline appearance.`,
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    category: 'digital',
    prompt: `Vaporwave aesthetic, neon pink and cyan colors, retro 80s elements, Greek statues, palm trees, sunset gradients, glitch effects, nostalgic feel.`,
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    category: 'digital',
    prompt: `Synthwave retro-futuristic style, neon grid landscapes, sunset gradients, chrome elements, 80s sci-fi aesthetic, glowing outlines, dark purple atmosphere.`,
  },

  // === 레트로/빈티지 (Retro) ===
  {
    id: 'retro_50s',
    name: '1950s Retro',
    category: 'retro',
    prompt: `1950s retro illustration style, mid-century modern aesthetic, limited color palette, vintage advertising feel, optimistic and cheerful mood.`,
  },
  {
    id: 'retro_70s',
    name: '1970s Groovy',
    category: 'retro',
    prompt: `1970s groovy style, warm orange and brown tones, psychedelic patterns, rounded typography influence, disco era aesthetic, funky and playful.`,
  },
  {
    id: 'pixel_art',
    name: 'Pixel Art',
    category: 'retro',
    prompt: `Retro pixel art style, 16-bit video game aesthetic, limited color palette, crisp pixels, nostalgic gaming feel, detailed sprite work.`,
  },
  {
    id: 'vintage_poster',
    name: 'Vintage Poster',
    category: 'retro',
    prompt: `Vintage travel poster style, bold simplified shapes, limited color palette, art deco influences, nostalgic tourism aesthetic, elegant typography space.`,
  },

  // === 판타지 (Fantasy) ===
  {
    id: 'fantasy_epic',
    name: 'Epic Fantasy',
    category: 'fantasy',
    prompt: `Epic fantasy art style, dramatic lighting, rich detailed environments, magical atmosphere, heroic composition, painterly digital art technique.`,
  },
  {
    id: 'storybook',
    name: "Children's Storybook",
    category: 'fantasy',
    prompt: `Whimsical children's book illustration, soft rounded shapes, warm friendly colors, gentle textures, magical and innocent atmosphere.`,
  },
  {
    id: 'paper_cut',
    name: 'Paper Cut Art',
    category: 'fantasy',
    prompt: `Paper cut art style, layered paper effect, soft shadows between layers, delicate silhouettes, handcrafted feel, subtle depth and dimension.`,
  },
  {
    id: 'collage',
    name: 'Mixed Media Collage',
    category: 'fantasy',
    prompt: `Mixed media collage style, torn paper textures, vintage photographs, layered elements, artistic composition, eclectic and creative feel.`,
  },

  // === [NEW] 어반/스트릿/SF (Urban & Sci-Fi) ===
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'urban',
    prompt: `Cyberpunk aesthetic, futuristic city, neon lights, rain-slicked streets, high-tech low-life, dark atmosphere with vibrant neon accents, futuristic fashion.`,
  },
  {
    id: 'steampunk',
    name: 'Steampunk',
    category: 'urban',
    prompt: `Steampunk style, victorian era meets sci-fi technology, brass and copper gears, steam power aesthetics, sepia tones, intricate mechanical details.`,
  },
  {
    id: 'graffiti',
    name: 'Street Art / Graffiti',
    category: 'urban',
    prompt: `Urban graffiti art style, bold spray paint textures, vibrant colors, drips and splatters, street culture aesthetic, dynamic and rebellious energy.`,
  },
  {
    id: 'lofi_anime',
    name: 'Lo-Fi Anime',
    category: 'urban',
    prompt: `Lo-fi hip hop aesthetic, retro anime style, grainy texture, muted colors, cozy atmosphere, late night vibes, nostalgic and relaxing.`,
  },

  // === 사실적 (Realistic) ===
  {
    id: 'cinematic',
    name: 'Cinematic Photo',
    category: 'realistic',
    prompt: `Cinematic photography style, dramatic film lighting, shallow depth of field, movie color grading, widescreen composition, atmospheric and moody.`,
  },
  {
    id: 'concept_art',
    name: 'Concept Art',
    category: 'realistic',
    prompt: `Professional concept art style, detailed environment design, atmospheric perspective, painterly technique, cinematic composition, rich details.`,
  },
  {
    id: 'architectural',
    name: 'Architectural Render',
    category: 'realistic',
    prompt: `Architectural visualization style, clean modern spaces, natural lighting, minimalist interior design, warm wood and white tones, lifestyle photography feel.`,
  },

  // === 아시아 (Asian) ===
  {
    id: 'chinese_ink',
    name: 'Chinese Ink Wash',
    category: 'asian',
    prompt: `Traditional Chinese ink wash painting (sumi-e), black ink gradients, minimalist composition, bamboo and mountain motifs, zen aesthetic, white space.`,
  },
  {
    id: 'korean_minhwa',
    name: 'Korean Minhwa',
    category: 'asian',
    prompt: `Korean traditional folk painting (minhwa) style, vibrant colors, symbolic animals and plants, decorative patterns, flat perspective, festive mood.`,
  },
  {
    id: 'ukiyoe',
    name: 'Ukiyo-e',
    category: 'asian',
    prompt: `Japanese ukiyo-e woodblock print style, flat colors, bold outlines, traditional Japanese aesthetic, wave patterns, nature motifs, elegant composition.`,
  },
  {
    id: 'indian_miniature',
    name: 'Indian Miniature',
    category: 'asian',
    prompt: `Indian miniature painting style, intricate details, rich jewel tones, gold accents, ornate borders, royal court scenes, traditional patterns.`,
  },

  // === 기타 (Others) ===
  {
    id: 'line_art',
    name: 'Minimalist Line Art',
    category: 'illustration',
    prompt: `Minimalist continuous line art style, single stroke drawings, elegant simplicity, white background, artistic and modern, clean aesthetic.`,
  },
];

// === Helper Functions ===

/**
 * 스타일 ID로 스타일 찾기
 */
export function getStyleById(id: string): ImageStyle | undefined {
  return IMAGE_STYLES.find((style) => style.id === id);
}

/**
 * 카테고리별 스타일 목록 가져오기
 */
export function getStylesByCategory(category: StyleCategory): ImageStyle[] {
  return IMAGE_STYLES.filter((style) => style.category === category);
}

/**
 * 랜덤 스타일 선택
 */
export function getRandomStyle(): ImageStyle {
  const index = Math.floor(Math.random() * IMAGE_STYLES.length);
  return IMAGE_STYLES[index];
}

/**
 * Type Safety를 위한 ID 유니온 타입 추출
 */
export type ImageStyleId = (typeof IMAGE_STYLES)[number]['id'];

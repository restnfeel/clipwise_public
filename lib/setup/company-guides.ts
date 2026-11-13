export const COMPANY_GUIDE_PATHS = {
  worldSetup: "/guides/clipwise/world-setup.md",
  knowledgeSetup: "/guides/clipwise/knowledge-setup.md",
  cloudtypeFirstDeploy: "/guides/clipwise/cloudtype-first-deploy.md",
} as const;

export type CompanyGuideId = keyof typeof COMPANY_GUIDE_PATHS;

export type CompanyGuide = {
  id: CompanyGuideId;
  title: string;
  description: string;
  url: string;
};

type EnvLike = Record<string, string | undefined>;

function httpOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return value.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** 안내 주소의 origin은 환경 변수로만 정한다. 값이 없거나 http(s)가 아니면 안내를 켜지 않는다. */
export function companyGuidesOrigin(env: EnvLike = process.env): string | null {
  const raw = env.NEXT_PUBLIC_COMPANY_GUIDES_ORIGIN?.trim();
  return raw ? httpOrigin(raw) : null;
}

export function companyGuideUrl(id: CompanyGuideId, env: EnvLike = process.env): string | null {
  const origin = companyGuidesOrigin(env);
  return origin ? `${origin}${COMPANY_GUIDE_PATHS[id]}` : null;
}

const GUIDE_COPY: Record<CompanyGuideId, { title: string; description: string }> = {
  worldSetup: {
    title: "월드 구성",
    description: "월드 DSL과 ESTC(대상·상태·전이·조건) 초기 구성 안내입니다. 이 공개 설치판에는 월드 편집 화면이 없습니다.",
  },
  knowledgeSetup: {
    title: "지식시스템 기본 설정",
    description: "원본 연결, 지식 카드, 공개 아카이브, MCP 공유를 처음 맞출 때 쓰는 안내입니다.",
  },
  cloudtypeFirstDeploy: {
    title: "Cloudtype 최초 배포 환경 변수",
    description: "첫 배포에 필요한 환경 변수 이름과 용도만 안내합니다. 값이나 비밀번호는 적지 않습니다.",
  },
};

/** 안내 주소 origin이 설정되지 않았으면 빈 배열을 돌려주고 화면은 이 구역을 숨긴다. */
export function listCompanyGuides(env: EnvLike = process.env): CompanyGuide[] {
  const origin = companyGuidesOrigin(env);
  if (!origin) return [];
  return (Object.keys(COMPANY_GUIDE_PATHS) as CompanyGuideId[]).map((id) => ({
    id,
    title: GUIDE_COPY[id].title,
    description: GUIDE_COPY[id].description,
    url: `${origin}${COMPANY_GUIDE_PATHS[id]}`,
  }));
}

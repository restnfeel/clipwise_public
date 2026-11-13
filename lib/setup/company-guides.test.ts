import { describe, expect, it } from "vitest";
import {
  COMPANY_GUIDE_PATHS,
  companyGuideUrl,
  companyGuidesOrigin,
  listCompanyGuides,
} from "./company-guides";

const ORIGIN = "https://guides.example.com";

const CONTRACT_PATHS = [
  "/guides/clipwise/world-setup.md",
  "/guides/clipwise/knowledge-setup.md",
  "/guides/clipwise/cloudtype-first-deploy.md",
] as const;

describe("회사 가이드 URL 계약", () => {
  it("공유 계약 경로 3개를 빠짐없이 둔다", () => {
    expect(Object.values(COMPANY_GUIDE_PATHS)).toEqual([...CONTRACT_PATHS]);
  });

  it("경로 슬러그에 정체성 금지 단어가 없다", () => {
    expect(Object.values(COMPANY_GUIDE_PATHS).join(" ")).not.toMatch(/estc|dsl|handmade|grok|핸드메이드/i);
  });

  it("origin 환경 변수와 경로를 붙여 공개 URL을 만든다", () => {
    const env = { NEXT_PUBLIC_COMPANY_GUIDES_ORIGIN: `${ORIGIN}/` };
    expect(companyGuidesOrigin(env)).toBe(ORIGIN);
    expect(companyGuideUrl("worldSetup", env)).toBe(`${ORIGIN}/guides/clipwise/world-setup.md`);
    expect(companyGuideUrl("knowledgeSetup", env)).toBe(`${ORIGIN}/guides/clipwise/knowledge-setup.md`);
    expect(companyGuideUrl("cloudtypeFirstDeploy", env)).toBe(`${ORIGIN}/guides/clipwise/cloudtype-first-deploy.md`);
  });

  it("origin이 없으면 안내를 켜지 않는다", () => {
    expect(companyGuidesOrigin({})).toBeNull();
    expect(companyGuideUrl("worldSetup", {})).toBeNull();
    expect(listCompanyGuides({})).toEqual([]);
  });

  it("http(s)가 아닌 origin은 무시한다", () => {
    const javascript = { NEXT_PUBLIC_COMPANY_GUIDES_ORIGIN: "javascript:alert(1)" };
    const relative = { NEXT_PUBLIC_COMPANY_GUIDES_ORIGIN: "not-a-url" };
    expect(companyGuidesOrigin(javascript)).toBeNull();
    expect(companyGuidesOrigin(relative)).toBeNull();
    expect(listCompanyGuides(javascript)).toEqual([]);
  });

  it("목록에 비밀값이나 값 입력 안내를 넣지 않는다", () => {
    const guides = listCompanyGuides({ NEXT_PUBLIC_COMPANY_GUIDES_ORIGIN: ORIGIN });
    expect(guides).toHaveLength(3);
    const blob = JSON.stringify(guides);
    expect(blob).not.toMatch(/sk-[A-Za-z0-9]|eyJ[A-Za-z0-9]|BEGIN [A-Z ]+PRIVATE KEY|service_role=\S+|NEXTAUTH_SECRET=\S+/);
    expect(guides.every((guide) => guide.url.startsWith(`${ORIGIN}/guides/clipwise/`))).toBe(true);
    expect(guides.map((guide) => guide.id)).toEqual(["worldSetup", "knowledgeSetup", "cloudtypeFirstDeploy"]);
  });
});

/**
 * 서버 기동 시 필수 환경 변수 검증 (프로덕션·스테이징)
 */

export type EnvValidationResult = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

/** 프로덕션에서 반드시 필요한 변수 */
const CRITICAL_ENV_KEYS = [
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "MCP_PUBLIC_BASE_URL",
] as const;

/** 없으면 경고만 (기능 일부 제한) */
const RECOMMENDED_ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
] as const;

function isSet(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
}

export function validateRuntimeEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  const isProdLike =
    process.env.NODE_ENV === "production";

  if (!isProdLike) {
    return { ok: true, missing: [], warnings: [] };
  }

  for (const key of CRITICAL_ENV_KEYS) {
    if (!isSet(key)) {
      missing.push(key);
    }
  }

  for (const key of RECOMMENDED_ENV_KEYS) {
    if (!isSet(key)) {
      warnings.push(key);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}

export function assertRuntimeEnvOrLog(): void {
  const result = validateRuntimeEnv();
  if (result.warnings.length > 0) {
    console.warn(
      "[env-validation] 권장 환경 변수 미설정:",
      result.warnings.join(", ")
    );
  }
  if (!result.ok) {
    const msg = `[env-validation] 필수 환경 변수 누락: ${result.missing.join(", ")}`;
    console.error(msg);
    throw new Error(msg);
  }
}

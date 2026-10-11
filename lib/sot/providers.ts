import type { SourceProvider } from "@/lib/sot/types";
export type SourceCredentialField = { key: string; label: string; secret: boolean; required: boolean; placeholder?: string; help?: string; pattern?: string };
export type SourceProviderInfo = { id: SourceProvider; label: string; summary: string; availability: "available"; detailHref: string | null; syncMode: "custom"; setupSteps: string[]; guideDoc: string | null; credentialFields: SourceCredentialField[]; connectionModes: readonly ["credentials"]; connectionMode: "credentials"; credentialScope: "user" };
export const SOURCE_PROVIDERS: readonly SourceProviderInfo[] = [{ id: "tiro", label: "Tiro", summary: "음성 기록 원본", availability: "available", detailHref: "/dashboard/sources", syncMode: "custom", setupSteps: [], guideDoc: null, credentialFields: [{ key: "apiKey", label: "API 키", secret: true, required: true }, { key: "workspaceGuid", label: "Workspace GUID", secret: false, required: true }], connectionModes: ["credentials"], connectionMode: "credentials", credentialScope: "user" }];
export function getSourceProviderInfo(id: string) { return SOURCE_PROVIDERS.find((provider) => provider.id === id) || null; }
export function isUserScopedProvider(id: string | null | undefined) { return id === "tiro"; }
export const USER_SCOPED_PROVIDER_IDS = ["tiro"] as const;
export function formatSyncedAt(value: string | null) { return value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : ""; }
export type SourceProviderStatus = { provider: SourceProvider; connected: boolean; connectionStatus: "active" | "paused" | "revoked" | "error" | null; count: number; lastSyncedAt: string | null; lastRun: unknown };

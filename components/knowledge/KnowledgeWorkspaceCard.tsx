"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { WorkspaceCover } from "@/components/blog/WorkspaceCover";
import { errorMessage, hubFetch, type WorkspaceSettings } from "@/components/knowledge/hub/hub-client";
import { notice } from "@/lib/notice";
import { workspaceDisplayName, WORKSPACE_NAME_MAX } from "@/lib/workspace/workspace-display";

const button = "inline-flex items-center justify-center gap-1.5 border px-3 py-2 text-xs font-semibold disabled:opacity-50";

type Props = { settings: WorkspaceSettings; onChange: (next: WorkspaceSettings) => void };

/** 지식함 상단 "내 워크스페이스": 지식 아카이브에 보일 이름과 표지를 정한다. */
export function KnowledgeWorkspaceCard({ settings, onChange }: Props) {
  const { workspace, canEdit } = settings;
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);
  const trimmed = name.replace(/\s+/g, " ").trim();
  const dirty = trimmed !== workspace.name;

  const saveName = async () => {
    if (!trimmed || Array.from(trimmed).length > WORKSPACE_NAME_MAX) { notice.error(`워크스페이스 이름은 1~${WORKSPACE_NAME_MAX}자로 입력해 주세요.`); return; }
    setSaving(true);
    try {
      const next = await hubFetch<WorkspaceSettings>("/api/workspace", { method: "PATCH", body: { name: trimmed } }, "이름을 저장하지 못했습니다.");
      onChange(next);
      setName(next.workspace.name);
      notice.success(`"${next.workspace.displayName}"로 저장했습니다.`);
    } catch (error) { notice.error(errorMessage(error, "이름을 저장하지 못했습니다.")); }
    finally { setSaving(false); }
  };

  return <div className="grid gap-5 border border-[var(--cw-border)] bg-[var(--cw-panel)] p-5 md:grid-cols-[16rem_minmax(0,1fr)]">
    <div className="aspect-video overflow-hidden border border-[var(--cw-border)]">
      <WorkspaceCover coverUrl={workspace.coverUrl} fallbackImage={workspace.fallbackImage} name={trimmed || workspace.name} />
    </div>
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--cw-accent)]">내 워크스페이스</p>
        <Link href={`/blog/workspace/${workspace.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cw-muted)] hover:text-[var(--cw-accent)]">아카이브 보기 <ExternalLink className="h-3 w-3" /></Link>
      </div>
      <p className="font-serif text-2xl">{workspaceDisplayName(trimmed || workspace.name)}</p>
      {canEdit ? <>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={WORKSPACE_NAME_MAX + 10} aria-label="워크스페이스 이름" placeholder="예: 디지로그랩스"
            className="min-w-0 flex-1 border border-[var(--cw-border)] bg-[var(--cw-paper)] px-3 py-2 text-sm outline-none focus:border-[var(--cw-accent)]" />
          <button type="button" onClick={() => void saveName()} disabled={!dirty || saving} className={`${button} border-[var(--cw-accent)] bg-[var(--cw-accent)] text-white`}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}이름 저장
          </button>
        </div>
        <p className="text-xs text-[var(--cw-muted)]">지식 아카이브에 &quot;{workspaceDisplayName(trimmed || workspace.name)}&quot;로 보입니다.</p>
      </> : <p className="text-xs text-[var(--cw-muted)]">워크스페이스 이름과 표지는 owner·admin만 바꿀 수 있습니다.</p>}
    </div>
  </div>;
}

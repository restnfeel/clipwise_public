import { workspaceInitial } from "@/lib/workspace/workspace-display";

type WorkspaceCoverProps = {
  coverUrl: string | null;
  fallbackImage: string | null;
  name: string;
  className?: string;
};

/** 표지 → owner 로그인 이미지 → 이름 첫 글자 순으로 보여준다. 외부 CDN·OAuth 이미지라 <img>를 쓴다. */
export function WorkspaceCover({ coverUrl, fallbackImage, name, className = "" }: WorkspaceCoverProps) {
  if (coverUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={coverUrl} alt={`${name} 표지`} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  if (fallbackImage) {
    return (
      <div className={`relative grid h-full w-full place-items-center overflow-hidden bg-[var(--cw-accent)]/10 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fallbackImage} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl" loading="lazy" referrerPolicy="no-referrer" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fallbackImage} alt={`${name} 대표 이미지`} className="relative h-20 w-20 rounded-full border-4 border-[var(--cw-paper)] object-cover shadow-lg" loading="lazy" referrerPolicy="no-referrer" />
      </div>
    );
  }
  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-[var(--cw-accent)]/25 to-[var(--cw-accent)]/5 ${className}`}>
      <span className="font-serif text-5xl text-[var(--cw-accent)]">{workspaceInitial(name)}</span>
    </div>
  );
}

import { NextResponse } from "next/server";
import { assertUserScopedCredentialProvider, credentialErrorResponse, requireCredentialUser } from "@/lib/sot/credential-api";
import { testSourceCredentials } from "@/lib/sot/credentials";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try { const { workspaceId, actor } = await requireCredentialUser(); const { provider } = await params; await assertUserScopedCredentialProvider(provider); const body = await request.json().catch(() => null) as { values?: unknown } | null; return NextResponse.json({ result: await testSourceCredentials({ workspaceId, provider, input: body?.values, actorUserId: actor.userId, ownerUserId: actor.userId }) }); }
  catch (error) { return credentialErrorResponse(error); }
}

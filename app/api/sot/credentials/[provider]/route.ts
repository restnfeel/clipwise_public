import { NextResponse } from "next/server";
import { assertUserScopedCredentialProvider, credentialErrorResponse, requireCredentialUser } from "@/lib/sot/credential-api";
import { deleteSourceCredentials, saveSourceCredentials } from "@/lib/sot/credentials";

type Context = { params: Promise<{ provider: string }> };

export async function PUT(request: Request, { params }: Context) {
  try { const { workspaceId, actor } = await requireCredentialUser(); const { provider } = await params; await assertUserScopedCredentialProvider(provider); const body = await request.json().catch(() => null) as { values?: unknown } | null; return NextResponse.json({ provider: await saveSourceCredentials({ workspaceId, provider, input: body?.values, actor, ownerUserId: actor.userId }) }); }
  catch (error) { return credentialErrorResponse(error); }
}

export async function DELETE(_request: Request, { params }: Context) {
  try { const { workspaceId, actor } = await requireCredentialUser(); const { provider } = await params; await assertUserScopedCredentialProvider(provider); return NextResponse.json({ provider: await deleteSourceCredentials({ workspaceId, provider, actorUserId: actor.userId, ownerUserId: actor.userId }) }); }
  catch (error) { return credentialErrorResponse(error); }
}

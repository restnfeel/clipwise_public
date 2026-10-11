import { NextResponse } from "next/server";
import { credentialErrorResponse, requireCredentialUser } from "@/lib/sot/credential-api";
import { listSourceCredentialStatuses } from "@/lib/sot/credentials";

export async function GET() {
  try { const { workspaceId, actor } = await requireCredentialUser(); return NextResponse.json({ providers: await listSourceCredentialStatuses(workspaceId, actor.userId) }); }
  catch (error) { return credentialErrorResponse(error); }
}

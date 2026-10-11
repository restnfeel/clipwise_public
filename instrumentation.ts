import { assertRuntimeEnvOrLog } from "@/lib/env-validation";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    assertRuntimeEnvOrLog();
  }
}

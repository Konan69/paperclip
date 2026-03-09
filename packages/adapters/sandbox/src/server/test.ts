import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import { asString, parseObject } from "@paperclipai/adapter-utils/server-utils";
import { createCloudflareSandboxProvider } from "@paperclipai/sandbox-provider-cloudflare";

function buildChecks(config: Record<string, unknown>): AdapterEnvironmentCheck[] {
  const checks: AdapterEnvironmentCheck[] = [];
  const providerType = asString(config.providerType, "cloudflare").trim() || "cloudflare";
  const providerConfig = parseObject(config.providerConfig);
  const sandboxAgentType = asString(config.sandboxAgentType, "").trim();

  if (providerType !== "cloudflare") {
    checks.push({
      code: "unsupported_provider",
      level: "error",
      message: `Unsupported sandbox provider "${providerType}"`,
      hint: "Use providerType=cloudflare for the current implementation.",
    });
  }

  if (!sandboxAgentType) {
    checks.push({
      code: "missing_agent_type",
      level: "error",
      message: "sandboxAgentType is required",
      hint: "Set the inner runtime, for example claude_local or codex_local.",
    });
  }

  if (!asString(providerConfig.baseUrl, "").trim()) {
    checks.push({
      code: "missing_base_url",
      level: "error",
      message: "providerConfig.baseUrl is required",
      hint: "Point this at your deployed Cloudflare sandbox gateway worker.",
    });
  }

  return checks;
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks = buildChecks(ctx.config);

  if (checks.some((check) => check.level === "error")) {
    return {
      adapterType: "sandbox",
      status: "fail",
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  try {
    const provider = createCloudflareSandboxProvider(ctx.config);
    const result = await provider.testConnection(ctx.config);
    checks.push({
      code: result.ok ? "provider_ok" : "provider_warn",
      level: result.ok ? "info" : "warn",
      message: result.ok ? "Cloudflare sandbox gateway reachable" : "Cloudflare sandbox gateway returned a warning",
      detail: result.detail ?? null,
    });
  } catch (err) {
    checks.push({
      code: "provider_unreachable",
      level: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    adapterType: "sandbox",
    status: checks.some((check) => check.level === "error") ? "fail" : "pass",
    checks,
    testedAt: new Date().toISOString(),
  };
}

# Sandboxed Agent Execution — Task Plan

**Goal:** Build a provider-agnostic sandbox interface for Paperclip that lets operators bring their own sandbox runtime (E2B, Cloudflare, Daytona, Fly.io Sprites, etc.) to run agents safely against untrusted input.

**Proposal:** https://github.com/paperclipai/paperclip/issues/248
**Branch:** master
**Status:** ✅ IMPLEMENTATION COMPLETE - live provider validation partially blocked by external services

---

## Phase 1: Define SandboxProvider Interface `[ completed ]`

Define the core abstraction in `packages/adapter-utils`.

```typescript
interface SandboxProvider {
  type: string;
  create(opts: SandboxCreateOpts): Promise<SandboxInstance>;
  destroy(instance: SandboxInstance): Promise<void>;
  testConnection(config: Record<string, unknown>): Promise<SandboxTestResult>;
}

interface SandboxInstance {
  id: string;
  exec(command: string, opts?: ExecOpts): Promise<ExecResult>;
  writeFile(path: string, content: string | Buffer): Promise<void>;
  readFile(path: string): Promise<string>;
  getEndpoint(): string;
  status(): Promise<"running" | "stopped" | "error">;
}
```

**Key decisions:**
- Interface lives in `packages/adapter-utils/src/types.ts` alongside existing adapter types
- Sandbox lifecycle: configurable per-heartbeat (ephemeral) or per-agent (persistent)
- Provider credentials managed via existing company secrets system

**Files to create/modify:**
- `packages/adapter-utils/src/sandbox-types.ts` — new file, SandboxProvider + SandboxInstance interfaces
- `packages/adapter-utils/src/index.ts` — re-export sandbox types

---

## Phase 2: Implement OpenSandbox Provider `[ completed ]`

Default self-hosted provider. Two-tier: lifecycle server (FastAPI) + execd sidecar (Go).

**Package:** `packages/sandbox-providers/opensandbox/`

**Key details:**
- SDK: `@alibaba-group/opensandbox` on npm
- Server: `opensandbox-server` (pip) or `opensandbox/server:latest` (Docker)
- Needs: Docker socket or K8s API access
- Isolation: Docker (dev), gVisor, Kata, Firecracker (prod)
- Images: `opensandbox/code-interpreter:v1.0.1` (Python, Node, Go, Java)
- Native Claude Code support, any Docker image works
- Free to self-host

**Implementation:**
- `create()` → `Sandbox.create(image, { serverUrl, env, timeout })`
- `exec()` → `sandbox.commands.run(command, { onStdout, onStderr })`
- `destroy()` → `sandbox.kill()`
- `writeFile()`/`readFile()` → `sandbox.files.write()` / `sandbox.files.read()`
- `getEndpoint()` → `sandbox.getUrl()`

**Operator setup:**
```bash
# Docker (alongside Paperclip)
docker run -d -p 8080:8080 -v /var/run/docker.sock:/var/run/docker.sock opensandbox/server:latest
```

## Phase 2b: Implement E2B Provider `[ completed ]`

Managed alternative for operators who don't want to run infra.

**Package:** `packages/sandbox-providers/e2b/`

**Key details:**
- SDK: `@e2b/sdk` on npm
- Template: `claude` (pre-built with Claude Code installed)
- Isolation: Firecracker microVM
- Pricing: ~$0.05/hr per 1 vCPU
- Max session: 24h (Pro tier)
- Cold start: ~150ms

**Implementation:**
- `create()` → `Sandbox.create('claude', { envs, timeoutMs })`
- `exec()` → `sandbox.commands.run(command)`
- `destroy()` → `sandbox.kill()`
- `writeFile()`/`readFile()` → sandbox filesystem API
- `getEndpoint()` → sandbox URL or Tailscale address

---

## Phase 3: Build SandboxAdapter `[ completed ]`

New Paperclip adapter type that composes a SandboxProvider with the existing `ServerAdapterModule` contract.

**Package:** `packages/adapters/sandbox/`

**Adapter contract to implement:**
- `execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult>`
- `testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult>`
- Optional `sessionCodec` for persistent sandbox sessions

**Execution flow:**
1. Resolve sandbox provider from agent config (`opensandbox`, `e2b`, `cloudflare`, etc.)
2. Resolve agent type from config (`claude`, `codex`, `opencode`, `pi`, `cursor`)
3. `provider.create()` — spin up sandbox with Paperclip env vars
4. Bootstrap token exchange for auth (pattern from cursor_cloud plan)
5. Write agent instructions / CLAUDE.md into sandbox
6. Build agent-specific CLI command (Path B — duplicated command knowledge per agent)
7. `instance.exec(command)` — run with streaming callbacks
8. Parse agent-specific output (lightweight per-agent parsers in sandbox adapter)
9. Extract usage/cost/session data
10. `provider.destroy()` — tear down sandbox
11. Return `AdapterExecutionResult`

**Agent CLI commands (Path B — duplicated, not imported from local adapters):**
```
claude:   claude --print -p --output-format stream-json --model {model}
codex:    codex --quiet --json {prompt}
opencode: opencode run --format json {prompt}
pi:       pi-acp {prompt}
cursor:   cursor-agent {prompt}
```

Each agent gets a lightweight output parser (~50-100 lines) in the sandbox adapter.
This avoids touching existing local adapters while keeping full usage/cost/billing tracking.

**Billing types supported:**
- `api` — per-token (Claude Code, Codex, OpenCode)
- `subscription` — flat rate (Cursor)
- `unknown` — fallback

**Auth flow (from cursor_cloud plan):**
- Mint one-time bootstrap token (agentId, companyId, runId, short TTL)
- Inject only: paperclipPublicUrl + exchange endpoint + bootstrap token
- Agent calls `POST /api/agent-auth/exchange` → gets run-scoped JWT
- No long-lived keys in the sandbox

**Files to create:**
- `packages/adapters/sandbox/src/index.ts` — type, label, models
- `packages/adapters/sandbox/src/server/execute.ts` — main execution
- `packages/adapters/sandbox/src/server/test.ts` — env test
- `packages/adapters/sandbox/src/server/index.ts` — exports + session codec
- `packages/adapters/sandbox/src/ui/build-config.ts` — config builder
- `packages/adapters/sandbox/src/ui/parse-stdout.ts` — event parser
- `packages/adapters/sandbox/src/cli/format-event.ts` — CLI formatter

---

## Phase 4: Register Adapter in System `[ completed ]`

Wire the new adapter into all layers.

**Files to modify:**
- `packages/shared/src/constants.ts` — add `sandbox` to `AGENT_ADAPTER_TYPES`
- `packages/shared/src/validators/agent.ts` — accept new type
- `server/src/adapters/registry.ts` — register SandboxAdapter
- `ui/src/adapters/registry.ts` — register UI adapter
- `cli/src/adapters/registry.ts` — register CLI adapter
- `ui/src/components/agent-config-primitives.tsx` — add labels
- `ui/src/components/AgentProperties.tsx` — add UI config fields

---

## Phase 5: Additional Providers `[ completed ]`

Implemented provider packages:

- Cloudflare provider package
- E2B provider package
- OpenSandbox provider package

- **Cloudflare Sandbox** — `packages/sandbox-providers/cloudflare/`
  - SDK: Cloudflare Workers API
  - Good for short-lived edge tasks
  - `getSandbox()`, `exec()`, `readFile()`/`writeFile()`
  - Instance types: lite (256MB), standard (512MB), heavy (1GB)
- **E2B** — direct SDK integration with template-based sandboxes
- **OpenSandbox** — direct SDK integration with image-based sandboxes

---

## Phase 6: Tailscale Ephemeral Tailnet Integration `[ deferred ]`

Optional networking layer for private Paperclip deployments.

- Sandbox joins ephemeral tailnet on creation
- Private access to Paperclip API without public exposure
- Tailscale AI Gateway proxies LLM API calls (keys never leave gateway)
- Network destroyed on sandbox teardown

**Depends on:** Tailscale ephemeral tailnet API availability

---

## Phase 7: GitHub Triage Pipeline (Dogfooding) `[ deferred ]`

Use the sandbox adapter to build Paperclip's own GitHub workflow.

1. GitHub webhook ingestion → Paperclip issues
2. Triage agent (sandboxed) → classify PRs/issues
3. Review agent (sandboxed) → code review alongside Greptile
4. Action agent → close/merge/comment (behind approval gates)

---

## Open Questions

| Question | Status | Answer |
|----------|--------|--------|
| Per-heartbeat (ephemeral) vs per-agent (persistent) sandbox lifecycle? | Resolved | `keepAlive` is configurable in adapter config and UI |
| Vendor Rivet Sandbox Agent SDK or build own execution layer? | Resolved | Path B — duplicate CLI command knowledge per agent in sandbox adapter. Rivet loses usage/cost tracking, OpenCode is experimental on their side, no billing type awareness. Our own parsers keep full observability. |
| Sandbox provider credentials management? | Resolved | Use existing company secrets system |
| Separate NetworkProvider interface for Tailscale? | Deferred | Not needed for current Cloudflare path |
| Bootstrap token exchange — reuse cursor_cloud impl or shared? | Deferred | Current Cloudflare gateway uses direct bearer auth; bootstrap exchange can be added when remote agent auth lands |

## Actual Delivered Scope

- Shared sandbox provider contracts
- Cloudflare sandbox provider package
- E2B sandbox provider package
- OpenSandbox sandbox provider package
- Sandbox adapter package with claude/codex/cursor/opencode/pi parsing support
- UI config/editor integration with provider-specific fields
- Server/CLI/UI adapter registration
- Cloudflare gateway example and docs
- Focused sandbox tests covering execution, provider dispatch, environment validation, and UI config mapping
- Browser-verified live UI/provider selection
- Live API validation for Cloudflare, E2B, and OpenSandbox branches

## Current External Blocker

- Real Cloudflare deploy is no longer blocked by local Docker. The remaining blocker is Cloudflare-side runtime/image readiness for live `exec`.

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | — | — |

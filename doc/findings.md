# Sandboxed Agent Execution — Findings

## Sandbox Provider Research (2026-03-07)

### Provider Comparison

| Provider | Isolation | Claude Code? | Persistence | Price/hr (1vCPU) | Cold Start |
|----------|-----------|-------------|-------------|-----------------|------------|
| E2B | Firecracker microVM | Official template | Ephemeral | $0.05 | ~150ms |
| Cloudflare Sandbox | Container | No official | Loses state on idle | ~$0.072 | Milliseconds |
| Daytona | Docker | Via Sandbox Agent SDK | Persistent | $0.067 | ~90ms |
| Fly.io Sprites | Firecracker microVM | Via Sandbox Agent SDK | 100GB NVMe persistent | Competitive | ~300ms resume |
| Northflank | Kata/gVisor/Firecracker | Via Sandbox Agent SDK | Both | $0.017 | Varies |
| Vercel Sandbox | Firecracker microVM | Via Sandbox Agent SDK | Ephemeral | $0.128 | Fast |
| Modal | gVisor | No | Snapshots | $0.119 | Sub-second |
| Blaxel | microVM | Yes | Persistent forever | N/A | 25ms resume |

### E2B (Recommended First Target)

- **SDK:** `@e2b/sdk` (TypeScript), `@e2b/code-interpreter` (Jupyter)
- **Claude Code template:** Pre-built `claude` template with Claude Code installed
- **Key flags:** `-p` (non-interactive), `--dangerously-skip-permissions`, `--output-format stream-json`, `--session-id`
- **API:** `Sandbox.create()`, `sandbox.commands.run()`, `sandbox.kill()`, `sandbox.isRunning()`
- **Reconnect:** Can reconnect to running sandbox by ID from different processes
- **Pricing:** Free tier ($100 credit), Pro $150/mo (24h sessions, 100 concurrent)
- **MCP:** 200+ tools via E2B MCP gateway
- **Reference app:** github.com/e2b-dev/claude-code-fastapi

### Cloudflare Sandbox

- **SDK:** `getSandbox(namespace, id, options?)` from Workers
- **APIs:** `exec()`, `readFile()`/`writeFile()`, `startProcess()`, `createSession()`, `exposePort()`, `wsConnect()`, `mountBucket()`
- **Instance types:** lite (256MB/0.5vCPU), standard (512MB/1vCPU), heavy (1GB/2vCPU)
- **Built on:** Durable Objects + Containers
- **Status:** Still experimental
- **Limitation:** Short-lived, loses state on idle, no official Claude Code support
- **Best for:** Edge-distributed, short-lived code execution tasks

### Cloudflare Containers (underlying tech)

- **Instance types:** lite to standard-4 (up to 4 vCPU, 12 GiB RAM, 20 GB disk)
- **Account limits:** 400 GiB total memory, 100 total vCPU, 2 TB total disk
- **Lifecycle:** `sleepAfter` configurable, 15 min graceful shutdown
- **Docker support:** Custom images
- **APIs:** `container.start()`, `container.startAndWaitForPorts()`, `container.fetch()`

### Alibaba OpenSandbox (Recommended Default Self-Hosted Provider)

- **Repo:** github.com/alibaba/OpenSandbox (Apache 2.0, 3845 stars in 2 days, released 2026-03-03)
- **SDK:** `@alibaba-group/opensandbox` on npm (v0.1.4)
- **Architecture:** Two-tier — lifecycle server (Python FastAPI) + execd sidecar (Go, port 44772)
- **Server required:** Yes, SDK cannot work without it
- **Server setup:** `pip install opensandbox-server` or `docker run opensandbox/server:latest`
- **Needs:** Docker socket (dev) or K8s API (prod)
- **Isolation:** Docker (dev), gVisor, Kata Containers, Firecracker (prod) — configurable
- **Images:** `opensandbox/code-interpreter:v1.0.1` (Python 3.10-3.14, Node 18/20/22, Go, Java, Jupyter)
- **Any Docker image works** — execd injected as sidecar by server
- **Claude Code:** Native support, example in `examples/claude-code/`
- **Also supports:** Gemini CLI, Codex, Kimi CLI, LangGraph, Google ADK
- **Network controls:** Built-in egress sidecar per sandbox
- **SDK API:** `Sandbox.create()`, `sandbox.commands.run()` (with streaming), `sandbox.files.write/read()`, `sandbox.kill()`
- **K8s operator:** Full Go operator with CRDs and Helm charts
- **Free to self-host**

### Rivet Sandbox Agent SDK (Evaluated, Not Using)

- **URL:** sandboxagent.dev
- **What:** ~15MB Rust binary, universal HTTP/SSE server on port 2468
- **Agents:** Claude Code, Codex, OpenCode (experimental), Pi, Cursor, Amp
- **API:** JSON-RPC 2.0 over HTTP, SSE streaming, WebSocket terminals
- **Normalized events:** `session.started/ended`, `turn.started/ended`, `item.delta/completed`
- **Works on:** E2B, Daytona, Vercel, Fly.io, Docker, Cloudflare
- **Why not using:**
  - OpenCode marked experimental on their side (we have full support)
  - No usage/cost extraction — loses token tracking and billing type info
  - Single global auth token — doesn't map to Paperclip's per-agent model
  - No subscription billing awareness (Cursor is subscription, not API)
  - Codex event coverage incomplete (no deltas/tool items)
- **Decision:** Path B instead — duplicate CLI command knowledge per agent in our sandbox adapter, write lightweight parsers, keep full observability

### Vibekit (Noted, Not Integrating Yet)

- **URL:** github.com/superagent-ai/vibekit (YC-backed, MIT)
- **What:** Safety layer for coding agents — data redaction + observability
- **Tracks:** Every file read/write, shell command, API call, outbound data
- **Runs in:** Docker sandbox, works with any agent
- **Role:** Optional security/monitoring layer on top of any provider, not a runtime itself

---

## Tailscale Research (2026-03-07)

### Core Concept
Mesh VPN built on WireGuard. Peer-to-peer encrypted connections, NAT-traversing, no port forwarding needed. Control plane (hub-spoke) exchanges keys + policies; data plane (mesh) carries actual traffic up to 10Gb/s.

### AI-Specific Features

**Ephemeral Tailnets:**
- Temporary networks spun up on demand, destroyed after
- "The network is the sandbox, not just the container or VM"
- Spin up sandbox → join ephemeral tailnet → sandbox can only talk to allowed services → network disappears

**AI Gateway:**
- Proxy that holds real API keys (OpenAI, Anthropic, etc.)
- Agents never touch keys directly
- Agents join tailnet with identity tags (e.g. `claude-pr-reviewbot`) via GitHub OIDC
- Per-tag policies control model access and quotas
- Full audit trail

### Paperclip Integration (Already Exists)
- `--tailscale-auth` / `--authenticated-private` flag
- Binds `0.0.0.0`, sets `PAPERCLIP_DEPLOYMENT_MODE=authenticated`, `PAPERCLIP_DEPLOYMENT_EXPOSURE=private`
- MagicDNS hostname support
- Allowed-hostname management via `paperclipai allowed-hostname`
- Cursor Cloud adapter plan already uses Tailscale URLs as callback URLs

---

## Paperclip Adapter System (2026-03-07)

### ServerAdapterModule Interface

```typescript
interface ServerAdapterModule {
  type: string;
  execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult>;
  testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult>;
  sessionCodec?: AdapterSessionCodec;
  supportsLocalAgentJwt?: boolean;
  models?: AdapterModel[];
  listModels?: () => Promise<AdapterModel[]>;
  agentConfigurationDoc?: string;
  onHireApproved?: (payload, adapterConfig) => Promise<HireApprovedHookResult>;
}
```

### Key Types

- `AdapterExecutionContext`: runId, agent, runtime, config, context, onLog, onMeta, authToken
- `AdapterExecutionResult`: exitCode, signal, timedOut, errorMessage, usage, sessionParams, provider, model, costUsd, resultJson
- `AdapterAgent`: id, companyId, name, adapterType, adapterConfig
- `AdapterRuntime`: sessionId, sessionParams, sessionDisplayId, taskKey

### Registration
Adapters registered in Map in `server/src/adapters/registry.ts`. Fallback to `processAdapter` for unknown types. Currently: claude_local, codex_local, cursor, opencode_local, pi_local, openclaw, process, http.

### Config Resolution
1. Base `agent.adapterConfig` (JSONB)
2. Issue assignee adapter overrides merged
3. Secrets resolved via `secretsSvc.resolveAdapterConfigForRuntime()`
4. Passed to `adapter.execute()` as `AdapterExecutionContext.config`

### Env Injection
Built-in: `PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_API_URL`, `PAPERCLIP_RUN_ID`
Task context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`, etc.
Workspace: `PAPERCLIP_WORKSPACE_CWD`, `PAPERCLIP_WORKSPACE_REPO_URL`, etc.
Custom: from `config.env` object

### Cursor Cloud Adapter Plan (Template for Remote Adapters)
- Located at `doc/plans/cursor-cloud-adapter.md`
- Bootstrap token exchange: mint one-time token → agent calls exchange endpoint → gets run-scoped JWT
- Webhook-driven status + polling fallback
- Skill delivery via authenticated fetch (not inline)
- Tailscale URL as callback for private deployments
- Generic cancellation hook for non-subprocess adapters

---

## Key File Locations

| Path | Purpose |
|------|---------|
| `packages/adapter-utils/src/types.ts` | Core adapter interface definitions |
| `server/src/adapters/registry.ts` | Adapter registration + lookup |
| `server/src/services/heartbeat.ts` | Invocation orchestration (invoke at ~line 1257) |
| `server/src/adapters/utils.ts` | buildPaperclipEnv, runChildProcess, helpers |
| `packages/shared/src/constants.ts` | AGENT_ADAPTER_TYPES enum |
| `packages/shared/src/validators/agent.ts` | Adapter type validation |
| `doc/plans/cursor-cloud-adapter.md` | Template for remote adapter pattern |
| `docs/deploy/tailscale-private-access.md` | Existing Tailscale integration docs |
| `doc/DEPLOYMENT-MODES.md` | Deployment mode reference |
| `.mailmap` | Author mappings (Forgotten = Dotta) |

## GitHub Users

| Name | GitHub | Role |
|------|--------|------|
| Dotta | @cryppadotta | Lead maintainer (516 commits) |
| Aaron | @aaaaron | Contributor |
| Forgotten | @forgottenrunes | Dotta's alt (per .mailmap) |

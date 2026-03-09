# Sandboxed Agent Execution — Progress Log

## Session: 2026-03-09

### Build Phase (Complete)

- [x] Added shared sandbox contracts in `packages/adapter-utils`
- [x] Added `@paperclipai/sandbox-provider-cloudflare`
- [x] Added `@paperclipai/sandbox-provider-e2b`
- [x] Added `@paperclipai/sandbox-provider-opensandbox`
- [x] Added `@paperclipai/adapter-sandbox`
- [x] Registered `sandbox` across shared/server/ui/cli
- [x] Added multi-provider sandbox config fields to the board UI
- [x] Added Cloudflare gateway example under `examples/cloudflare-sandbox-gateway`
- [x] Added sandbox adapter docs in `doc/SANDBOX-ADAPTER.md`

### Hardening Pass (Complete)

- [x] Fixed Cloudflare provider namespace propagation on reconnect/status/exec/files
- [x] Fixed Cloudflare non-interactive CLI execution by emulating `stdin` with temp files
- [x] Added provider contract test coverage for namespace + stdin behavior
- [x] Added E2B/OpenSandbox provider dispatch + validation coverage
- [x] Validated example worker typecheck after gateway changes

### Verification Phase (Mostly Complete)

- [x] `pnpm -r typecheck`
- [x] `pnpm build`
- [x] Focused sandbox tests
- [x] Browser verification of sandbox UI fields
- [x] Live API verification of provider-specific `Test environment` validation
- [x] API verification that Cloudflare provider still passes live environment checks
- [x] Real Cloudflare deployment from `wrangler deploy`
- [~] Real Cloudflare sandbox `exec` validation

### Live Validation Notes

- Local Paperclip dev server running at `http://127.0.0.1:3100`
- Helium CDP instance created on `127.0.0.1:9333` using the real `net.imput.helium` profile
- Created/used company `Sandbox Co` and agent `Sandbox Tester`
- Sandbox adapter tested end to end against a local mock Cloudflare gateway on `http://127.0.0.1:4011`
- UI showed `Passed` for environment test
- Manual heartbeat succeeded and parsed:
  - assistant text: `mock sandbox heartbeat ok`
  - usage: input `11`, output `5`, cached `2`
  - session: `mock-thread-1`
- Real Cloudflare gateway deployed at `https://paperclip-sandbox-gateway.kixeyems0.workers.dev`
- Real Cloudflare Paperclip environment test passed against the deployed Worker
- Real Cloudflare sandbox creation now returns `200` from `/v1/sandboxes`
- Real Cloudflare sandbox `exec` is still blocked on container readiness in the last fully published image
- Live API now validates new provider branches:
  - `e2b` missing template -> structured validation failure
  - `e2b` with dummy key + template -> reaches provider and returns auth failure
  - `opensandbox` missing image -> structured validation failure
  - `opensandbox` with dummy key + image -> reaches provider and returns connectivity failure
- Browser-verified live UI now swaps provider-specific fields for Cloudflare, E2B, and OpenSandbox

### Post-Completion Improvements (2026-03-09)

Updated Cloudflare gateway example with improvements:
- Fixed Docker base image to specific version (0.7.0) for reproducibility
- Added opencode-ai support to the gateway container
- Added deployment notes to README (workers.dev enablement, container provisioning delay)
- Updated Cloudflare dependencies to latest versions
- Removed redundant workspace directory creation command
- Added clean `PaperclipSandbox` namespace migration while preserving legacy `Sandbox` export

### External Blockers (Current)

1. Cloudflare live `exec` still hangs during sandbox readiness on the last fully published image
2. External provider live sign-up/credential validation is incomplete:
   - `e2b.dev` refuses direct connections from this machine even though other internet access works
   - OpenSandbox public hostnames/docs appear inconsistent from this environment
3. A new Cloudflare gateway image push is in progress in shell session `87603`

### Known Unrelated Repo Failures

- `pnpm test:run` still fails in existing non-sandbox tests:
  - `packages/adapters/opencode-local/src/server/parse.test.ts`
  - `server/src/__tests__/opencode-local-adapter.test.ts`
  - `server/src/__tests__/opencode-local-adapter-environment.test.ts`
  - `server/src/__tests__/cursor-local-adapter-environment.test.ts`
  - `server/src/__tests__/cursor-local-execute.test.ts`

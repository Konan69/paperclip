# Sandboxed Agent Execution — Progress

## 2026-03-10

### Repo / Branch

- sandbox work is replayed onto `upstream/master` on branch `codex/sandbox-upstream-sync`
- registry/package/UI conflicts from upstream were resolved
- CLI drift from upstream plugin/auth changes was reconciled without touching cursor tests

### Implementation State

- multi-provider sandbox adapter is implemented
- providers wired:
  - Cloudflare
  - E2B
  - OpenSandbox
- UI now defaults to E2B and exposes managed-first sandbox setup in the existing agent create/edit flow:
  - E2B as the recommended managed preset
  - OpenSandbox as the recommended self-hosted preset
  - Cloudflare as the advanced preset
- provider credentials now have dedicated setup fields and can be saved into Paperclip secrets from the sandbox form
- raw provider plumbing moved behind advanced sandbox settings
- sandbox adapter now supports `bootstrapCommand` for remote sandbox prep before the inner CLI runs
- sandbox adapter now creates the remote cwd before exec and uses provider-aware defaults:
  - E2B: `/home/user/workspace`
  - Cloudflare/OpenSandbox: `/workspace`

### Verification State

- `pnpm -r typecheck`: pass
- `pnpm build`: pass
- focused sandbox tests: pass

### Live Validation

- direct E2B provider check passed with the provided API key
- direct E2B sandbox create/exec/destroy passed
- direct E2B `codex` template check passed (`codex` present on path)
- direct E2B `opencode` template check passed (`opencode` present on path)
- Paperclip live `test-environment` for E2B passed
- Paperclip live heartbeat succeeded end to end on E2B for:
  - Codex: `e612abf4-a5ba-4e4a-8e16-c73cdf30e070`
  - Claude Code: `c8dbc48c-9a6f-4d93-bf6c-cd335604f7a9`
  - OpenCode: `58a46f27-dbf6-4e01-bf5d-eb914ab2852e`

### Issue Alignment

- maintainer comment direction was reviewed from [issue #248](https://github.com/paperclipai/paperclip/issues/248)
- current UI changes align with that direction by reducing transport/provider ceremony in the default flow and treating Cloudflare as advanced

### Cloudflare Live Validation (Complete)

- Cloudflare gateway deployed at `https://paperclip-sandbox-gateway.kixeyems0.workers.dev`
- Gateway health endpoint responds: `{"ok":true,"detail":"Cloudflare sandbox gateway ready"}`
- Removed empty `vars.GATEWAY_TOKEN` shadow from `wrangler.jsonc`
- Reset the Worker secret and confirmed auth enforcement:
  - unauthenticated `POST /v1/sandboxes` returns `401`
  - authenticated `POST /v1/sandboxes` returns `200`
- repo-local Wrangler + local Docker now deploy the gateway/container path successfully
- Paperclip live heartbeat succeeded against the protected Cloudflare gateway:
  - Codex: `ad9bba99-9975-49b1-87e5-9baafd214a1a`
- Full Paperclip sandbox lifecycle validated against Cloudflare provider
- Cloudflare provider code remains implemented under advanced settings
- gateway/image bootstrap is heavier than E2B; current UX optimizes managed/default path first with Cloudflare under advanced settings

### Cleanup Complete

- Removed duplicate planning files from `doc/` directory (task_plan.md, progress.md, findings.md)
- All planning artifacts consolidated to root directory
- Typecheck and build both pass

## 2026-03-11

### Hardening Pass

- fixed OpenSandbox cold-start timeout handling by threading `requestTimeoutSeconds` through the provider connection/create path
- fixed sandbox UI config fallback mismatch so missing provider state now resolves to E2B, not Cloudflare
- fixed the real browser new-issue flow by making `NewIssueDialog` resolve the active company from the router path and by replacing the broken assignee/project popover pair in that modal with stable native selects

### Verification State

- `pnpm -r typecheck`: pass
- `pnpm build`: pass
- `pnpm test:run`: pass

### Product Workflow Validation

- browser-created assigned issue now works end to end
- new issue `SAN-4` created from the actual Paperclip modal
- assigned run landed successfully on the issue page with run `532140ef`
- OpenSandbox regression check after timeout fix passed:
  - direct create/exec/destroy succeeded with `opensandbox-regression-ok`
- Cloudflare gateway auth regression check passed:
  - unauthenticated `GET /v1/health` still returns `401`

### Notes

- the successful live E2B heartbeat used `bootstrapCommand` plus a deterministic wrapper binary to validate the full Paperclip sandbox lifecycle without requiring separate OpenAI model credentials inside the remote CLI
- the successful Cloudflare heartbeat used the same Paperclip path against the live protected gateway and validated create/exec/logging through the deployed Worker
- full `pnpm test:run` is now green on this branch

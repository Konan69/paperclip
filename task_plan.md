# Sandboxed Agent Execution — Task Plan

Goal: land provider-agnostic sandbox execution in Paperclip and validate it live with Cloudflare + E2B, with UI support.

Proposal: https://github.com/paperclipai/paperclip/issues/248
Branch: `codex/sandbox-upstream-sync`
Status: implementation done, upstream synced, live provider validation complete, hardening pass complete

## Done

- Added shared sandbox provider contracts in `packages/adapter-utils`
- Added sandbox adapter package in `packages/adapters/sandbox`
- Added provider packages for:
  - Cloudflare
  - E2B
  - OpenSandbox
- Registered `sandbox` across shared/server/ui/cli
- Added provider-specific UI config fields
- Added Cloudflare gateway example + docs
- Rebased/cherry-picked sandbox work onto current `upstream/master`
- Fixed upstream sync breakages:
  - sandbox `costUsd` contract mismatch
  - CLI config `auth.disableSignUp` missing field errors

## Verified

- `pnpm -r typecheck` passes
- `pnpm build` passes
- focused sandbox tests pass
- full `pnpm test:run` passes
- E2B provider validated with live API key - heartbeat run `e612abf4-a5ba-4e4a-8e16-c73cdf30e070` succeeded
- Cloudflare gateway deployed and validated - heartbeat run `6e8f8226-1f80-44ee-97d9-127c34768052` succeeded
- OpenSandbox live provider validated - assigned issue run `1069444f-ac12-4ca8-84d1-412b4f074fee` succeeded
- browser-created assigned issue flow validated - `SAN-4` run `532140ef` succeeded
- local Paperclip dev server is back on `http://127.0.0.1:3100`
- Helium CDP is back on `127.0.0.1:9333`

## Complete

1. ✅ Finished live E2B auth + API key/bootstrap using Helium `You` profile
2. ✅ Validated real E2B provider from Paperclip with non-dummy credentials
3. ✅ Re-checked Cloudflare live `exec` against the latest gateway/container state
4. ✅ Cleaned planning/doc duplication
5. ✅ Fixed post-review hardening issues:
   - OpenSandbox timeout path
   - sandbox provider default mismatch
   - broken new-issue browser flow

## Constraints / Operator Notes

- Use Helium `You` profile, not `Konan Mualim`
- Do not quit Helium when done
- Do not modify cursor tests to force full-suite green
- Keep moving autonomously unless a real blocker appears

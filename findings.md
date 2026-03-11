# Sandboxed Agent Execution — Findings

## Upstream / Plugin

- current upstream plugin work is docs/spec, not a landed runtime/plugin system
- relevant merge: `72cc748`
- sandbox work had to be replayed onto upstream because upstream does not contain it

## Sandboxing

- Cloudflare requires a Worker gateway layer for Paperclip's Node server to reach Sandbox cleanly
- E2B and OpenSandbox are direct-connect server-side providers and do not need that Worker indirection

## Verification

- latest upstream exposed two real integration issues during sync:
  - sandbox OpenCode cost field mismatch
  - CLI auth config shape now requires `disableSignUp`
- both are fixed in the current branch

## Live Provider Validation

### E2B
- E2B provider validated with live API key
- `codex` and `opencode` templates are reachable with provider key
- Bootstrap command + deterministic wrapper binary validates full lifecycle without requiring OpenAI credentials in remote CLI
- Successful heartbeat run: `e612abf4-a5ba-4e4a-8e16-c73cdf30e070`

### Cloudflare
- Cloudflare gateway deployed at `https://paperclip-sandbox-gateway.kixeyems0.workers.dev`
- Gateway health endpoint responds correctly
- Adapter environment test passed
- Full Paperclip sandbox lifecycle validated against Cloudflare provider
- Successful heartbeat run: `6e8f8226-1f80-44ee-97d9-127c34768052`

### Live Auth / Browser

- Helium CDP works when launched with `--remote-debugging-port=9333`
- browser identity matters here; using the wrong Google account leads to the wrong E2B auth path
- operator used the Helium `You` profile to complete E2B auth flow

## Testing

- sandbox code is compiling and building on current upstream
- full `pnpm test:run` now passes on this branch

## Hardening Follow-through

- OpenSandbox cold-start timeout issue is fixed in the provider
- sandbox UI/provider fallback mismatch is fixed
- browser new-issue creation is fixed and validated through a real assigned issue run

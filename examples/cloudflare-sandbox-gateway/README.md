# Cloudflare Sandbox Gateway

Reference gateway for Paperclip's `sandbox` adapter using Cloudflare Sandbox.

What it does:
- exposes a small HTTP control plane for Paperclip
- reuses Cloudflare sandboxes by stable ID
- streams command output back as NDJSON
- supports file read/write and sandbox destroy

## Deploy

```sh
cd examples/cloudflare-sandbox-gateway
pnpm install
pnpm wrangler login
pnpm wrangler secret put GATEWAY_TOKEN
pnpm deploy
```

Then configure a Paperclip agent:
- `adapterType`: `sandbox`
- `providerType`: `cloudflare`
- `providerConfig.baseUrl`: your deployed Worker URL
- `providerConfig.namespace`: `paperclip`
- `env.CLOUDFLARE_GATEWAY_TOKEN`: secret ref or plain env for the same token

## Notes

- The container image in this example installs `claude` and `codex`.
- `opencode`, `pi`, and `cursor` need a custom image if you want them available in Cloudflare.
- The current Paperclip adapter keeps state by sandbox ID when `keepAlive=true`.
- Cloudflare image and instance type are primarily controlled by `wrangler.jsonc`. The gateway keeps the Paperclip API stable even if the underlying SDK evolves.

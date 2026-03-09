# Sandboxed Agent Adapter

Paperclip now includes a `sandbox` adapter type for running CLI agents inside a remote sandbox instead of directly on the Paperclip host.

## Current provider

- `cloudflare`

The current implementation uses a small gateway Worker that wraps Cloudflare Sandbox and exposes a stable HTTP API back to Paperclip.

Reference implementation:
- [`/Users/Konan/Documents/personal/paperclip/examples/cloudflare-sandbox-gateway/README.md`](/Users/Konan/Documents/personal/paperclip/examples/cloudflare-sandbox-gateway/README.md)

## Adapter config shape

Top-level fields:
- `providerType`
- `sandboxAgentType`
- `keepAlive`
- `providerConfig.baseUrl`
- `providerConfig.namespace`
- `providerConfig.instanceType`
- `providerConfig.image`

Inner CLI fields follow the same general shape as the local adapters:
- `cwd`
- `instructionsFilePath`
- `promptTemplate`
- `bootstrapPromptTemplate`
- `command`
- `model`
- `extraArgs`
- `env`

Provider auth:
- set `env.CLOUDFLARE_GATEWAY_TOKEN` to the same bearer token configured on the gateway

## Session behavior

- `keepAlive=true`: Paperclip stores sandbox ID plus inner agent session ID and attempts resume on the next heartbeat
- `keepAlive=false`: Paperclip destroys the sandbox after the run and clears the stored session

## UI behavior

The board UI exposes `sandbox` as a normal adapter type in the existing agent create/edit form. The adapter-specific section collects the provider URL, namespace, instance type, image, keep-alive policy, and inner CLI runtime.

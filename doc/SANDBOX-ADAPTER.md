# Sandboxed Agent Adapter

Paperclip now includes a `sandbox` adapter type for running CLI agents inside a remote sandbox instead of directly on the Paperclip host.

## Providers

- `cloudflare`
- `e2b`
- `opensandbox`

Cloudflare uses a small gateway Worker that wraps Cloudflare Sandbox and exposes a stable HTTP API back to Paperclip.
E2B and OpenSandbox connect directly from the Paperclip server through their SDKs.

Reference implementation:
- [`/Users/Konan/Documents/personal/paperclip/examples/cloudflare-sandbox-gateway/README.md`](/Users/Konan/Documents/personal/paperclip/examples/cloudflare-sandbox-gateway/README.md)

## Adapter config shape

Top-level fields:
- `providerType`
- `sandboxAgentType`
- `keepAlive`
- `providerConfig.baseUrl` (Cloudflare)
- `providerConfig.namespace` (Cloudflare)
- `providerConfig.instanceType` (Cloudflare)
- `providerConfig.template` (E2B)
- `providerConfig.domain` (E2B/OpenSandbox)
- `providerConfig.image` (Cloudflare/OpenSandbox)

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
- set `env.E2B_API_KEY` or `env.E2B_ACCESS_TOKEN` for E2B
- set `env.OPEN_SANDBOX_API_KEY` for OpenSandbox

## Session behavior

- `keepAlive=true`: Paperclip stores sandbox ID plus inner agent session ID and attempts resume on the next heartbeat
- `keepAlive=false`: Paperclip destroys the sandbox after the run and clears the stored session

## UI behavior

The board UI exposes `sandbox` as a normal adapter type in the existing agent create/edit form.

- Cloudflare shows gateway URL, namespace, instance type, and image
- E2B shows template and optional API domain
- OpenSandbox shows optional API domain and image

The rest of the sandbox section stays shared: inner CLI runtime, keep-alive policy, instructions file, command/model/env controls, and environment testing.

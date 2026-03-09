import { models as claudeModels } from "@paperclipai/adapter-claude-local";
import { models as codexModels } from "@paperclipai/adapter-codex-local";
import { models as cursorModels } from "@paperclipai/adapter-cursor-local";

export const type = "sandbox";
export const label = "Sandboxed Agent";

export const models = [
  ...claudeModels.map((model) => ({ ...model, label: `Claude: ${model.label}` })),
  ...codexModels.map((model) => ({ ...model, label: `Codex: ${model.label}` })),
  ...cursorModels.map((model) => ({ ...model, label: `Cursor: ${model.label}` })),
];

export const agentConfigurationDoc = `# sandbox agent configuration

Adapter: sandbox

Core fields:
- sandboxAgentType (string, required): claude_local | codex_local | opencode_local | pi_local | cursor
- providerType (string, required): currently cloudflare
- providerConfig.baseUrl (string, required): URL of the sandbox gateway
- providerConfig.namespace (string, optional): Cloudflare sandbox namespace, default "paperclip"
- providerConfig.instanceType (string, optional): Cloudflare instance type like lite | standard | heavy
- providerConfig.image (string, optional): container image with the target CLI installed
- keepAlive (boolean, optional): keep sandbox/session alive across heartbeats

Inner agent fields mirror the matching local adapter where practical:
- cwd
- instructionsFilePath
- promptTemplate
- bootstrapPromptTemplate
- command
- model
- effort | modelReasoningEffort | variant | mode
- extraArgs
- env
- timeoutSec
- graceSec
`;

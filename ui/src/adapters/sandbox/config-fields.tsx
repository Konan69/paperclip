import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  ToggleField,
  DraftInput,
  help,
} from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

const sandboxAgentOptions = [
  { value: "claude_local", label: "Claude Code" },
  { value: "codex_local", label: "Codex" },
  { value: "opencode_local", label: "OpenCode" },
  { value: "pi_local", label: "Pi" },
  { value: "cursor", label: "Cursor" },
] as const;

const sandboxProviderOptions = [
  { value: "cloudflare", label: "Cloudflare" },
  { value: "e2b", label: "E2B" },
  { value: "opensandbox", label: "OpenSandbox" },
] as const;

const instanceTypeOptions = ["lite", "standard", "heavy"] as const;

export function SandboxConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  const providerConfig = (config.providerConfig ?? {}) as Record<string, unknown>;
  const providerType = isCreate
    ? values!.sandboxProviderType
    : eff("adapterConfig", "providerType", String(config.providerType ?? "cloudflare"));

  const updateProviderConfig = (next: Record<string, unknown>) =>
    mark("adapterConfig", "providerConfig", { ...providerConfig, ...next });

  return (
    <>
      <Field label="Sandbox runtime" hint={help.sandboxAgentType}>
        <select
          className={inputClass}
          value={
            isCreate
              ? values!.sandboxAgentType
              : eff("adapterConfig", "sandboxAgentType", String(config.sandboxAgentType ?? "claude_local"))
          }
          onChange={(event) =>
            isCreate
              ? set!({ sandboxAgentType: event.target.value })
              : mark("adapterConfig", "sandboxAgentType", event.target.value)
          }
        >
          {sandboxAgentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Sandbox provider" hint={help.sandboxProviderType}>
        <select
          className={inputClass}
          value={
            providerType
          }
          onChange={(event) =>
            isCreate
              ? set!({ sandboxProviderType: event.target.value })
              : mark("adapterConfig", "providerType", event.target.value)
          }
        >
          {sandboxProviderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      {providerType === "cloudflare" && (
        <>
          <Field label="Gateway URL" hint={help.sandboxBaseUrl}>
            <DraftInput
              value={
                isCreate
                  ? values!.sandboxBaseUrl
                  : String(providerConfig.baseUrl ?? "")
              }
              onCommit={(value) =>
                isCreate
                  ? set!({ sandboxBaseUrl: value })
                  : updateProviderConfig({ baseUrl: value || undefined })
              }
              immediate
              className={inputClass}
              placeholder="https://paperclip-sandbox.<subdomain>.workers.dev"
            />
          </Field>

          <Field label="Namespace" hint={help.sandboxNamespace}>
            <DraftInput
              value={
                isCreate
                  ? values!.sandboxNamespace
                  : String(providerConfig.namespace ?? "paperclip")
              }
              onCommit={(value) =>
                isCreate
                  ? set!({ sandboxNamespace: value })
                  : updateProviderConfig({ namespace: value || "paperclip" })
              }
              immediate
              className={inputClass}
              placeholder="paperclip"
            />
          </Field>

          <Field label="Instance type" hint={help.sandboxInstanceType}>
            <select
              className={inputClass}
              value={
                isCreate
                  ? values!.sandboxInstanceType
                  : String(providerConfig.instanceType ?? "standard")
              }
              onChange={(event) =>
                isCreate
                  ? set!({ sandboxInstanceType: event.target.value })
                  : updateProviderConfig({ instanceType: event.target.value })
              }
            >
              {instanceTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Container image" hint={help.sandboxImage}>
            <DraftInput
              value={
                isCreate
                  ? values!.sandboxImage
                  : String(providerConfig.image ?? "")
              }
              onCommit={(value) =>
                isCreate
                  ? set!({ sandboxImage: value })
                  : updateProviderConfig({ image: value || undefined })
              }
              immediate
              className={inputClass}
              placeholder="ghcr.io/paperclipai/cloudflare-agent-sandbox:latest"
            />
          </Field>
        </>
      )}

      {providerType === "e2b" && (
        <>
          <Field label="Template" hint={help.sandboxTemplate}>
            <DraftInput
              value={
                isCreate
                  ? values!.sandboxTemplate
                  : String(providerConfig.template ?? providerConfig.image ?? "")
              }
              onCommit={(value) =>
                isCreate
                  ? set!({ sandboxTemplate: value })
                  : updateProviderConfig({ template: value || undefined })
              }
              immediate
              className={inputClass}
              placeholder="paperclip-codex or team/snapshot:latest"
            />
          </Field>

          <Field label="API domain" hint={help.sandboxDomain}>
            <DraftInput
              value={
                isCreate
                  ? values!.sandboxDomain
                  : String(providerConfig.domain ?? "")
              }
              onCommit={(value) =>
                isCreate
                  ? set!({ sandboxDomain: value })
                  : updateProviderConfig({ domain: value || undefined })
              }
              immediate
              className={inputClass}
              placeholder="e2b.app"
            />
          </Field>
        </>
      )}

      {providerType === "opensandbox" && (
        <>
          <Field label="API domain" hint={help.sandboxDomain}>
            <DraftInput
              value={
                isCreate
                  ? values!.sandboxDomain
                  : String(providerConfig.domain ?? "")
              }
              onCommit={(value) =>
                isCreate
                  ? set!({ sandboxDomain: value })
                  : updateProviderConfig({ domain: value || undefined })
              }
              immediate
              className={inputClass}
              placeholder="api.opensandbox.io"
            />
          </Field>

          <Field label="Container image" hint={help.sandboxImage}>
            <DraftInput
              value={
                isCreate
                  ? values!.sandboxImage
                  : String(providerConfig.image ?? "")
              }
              onCommit={(value) =>
                isCreate
                  ? set!({ sandboxImage: value })
                  : updateProviderConfig({ image: value || undefined })
              }
              immediate
              className={inputClass}
              placeholder="ghcr.io/paperclipai/agent-sandbox:latest"
            />
          </Field>
        </>
      )}

      <ToggleField
        label="Keep sandbox alive"
        hint={help.sandboxKeepAlive}
        checked={
          isCreate
            ? values!.sandboxKeepAlive
            : eff("adapterConfig", "keepAlive", config.keepAlive === true)
        }
        onChange={(value) =>
          isCreate
            ? set!({ sandboxKeepAlive: value })
            : mark("adapterConfig", "keepAlive", value)
        }
      />

      <Field label="Agent instructions file" hint={help.instructionsFilePath}>
        <div className="flex items-center gap-2">
          <DraftInput
            value={
              isCreate
                ? values!.instructionsFilePath ?? ""
                : eff("adapterConfig", "instructionsFilePath", String(config.instructionsFilePath ?? ""))
            }
            onCommit={(value) =>
              isCreate
                ? set!({ instructionsFilePath: value })
                : mark("adapterConfig", "instructionsFilePath", value || undefined)
            }
            immediate
            className={inputClass}
            placeholder="/absolute/path/to/AGENTS.md"
          />
          <ChoosePathButton />
        </div>
      </Field>
    </>
  );
}

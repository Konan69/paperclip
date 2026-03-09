import { afterEach, describe, expect, it } from "vitest";
import { execute, setSandboxProviderFactoryForTests } from "./execute.js";

describe("sandbox adapter execute", () => {
  afterEach(() => {
    setSandboxProviderFactoryForTests(null);
  });

  it("runs the inner codex agent, wraps stdout, and persists sandbox session params", async () => {
    const stdoutEvents = [
      JSON.stringify({ type: "thread.started", thread_id: "thread-123" }),
      JSON.stringify({
        type: "item.completed",
        item: { type: "agent_message", text: "sandbox hello" },
      }),
      JSON.stringify({
        type: "turn.completed",
        usage: { input_tokens: 12, cached_input_tokens: 3, output_tokens: 4 },
      }),
    ].join("\n");

    const execCalls: Array<{ command: string; stdin?: string }> = [];

    setSandboxProviderFactoryForTests(() => ({
      type: "cloudflare",
      async create(opts) {
        return {
          id: opts.sandboxId,
          async exec(command, execOpts = {}) {
            execCalls.push({ command, stdin: execOpts.stdin });
            await execOpts.onStdout?.(`${stdoutEvents}\n`);
            return { exitCode: 0, signal: null, timedOut: false };
          },
          async writeFile() {},
          async readFile() {
            return "";
          },
          async status() {
            return { status: "running", endpoint: null };
          },
          async destroy() {},
        };
      },
      async reconnect(id) {
        return {
          id,
          async exec() {
            return { exitCode: 0, signal: null, timedOut: false };
          },
          async writeFile() {},
          async readFile() {
            return "";
          },
          async status() {
            return { status: "running", endpoint: null };
          },
          async destroy() {},
        };
      },
      async testConnection() {
        return { ok: true };
      },
    }));

    const logs: string[] = [];

    const result = await execute({
      runId: "run-1",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "Sandbox Agent",
        adapterType: "sandbox",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        providerType: "cloudflare",
        sandboxAgentType: "codex_local",
        keepAlive: true,
        promptTemplate: "Do the thing",
        providerConfig: {
          baseUrl: "https://example.workers.dev",
          namespace: "paperclip",
        },
      },
      context: {},
      onLog: async (_stream, chunk) => {
        logs.push(chunk);
      },
      onMeta: async () => {},
      authToken: "jwt-token",
    });

    expect(execCalls).toHaveLength(1);
    expect(execCalls[0]?.stdin).toContain("Do the thing");
    expect(result.summary).toBe("sandbox hello");
    expect(result.usage).toEqual({
      inputTokens: 12,
      cachedInputTokens: 3,
      outputTokens: 4,
    });
    expect(result.sessionParams).toEqual({
      sandboxId: expect.any(String),
      agentType: "codex_local",
      cliSession: { sessionId: "thread-123" },
    });
    expect(logs.join("")).toContain('"type":"paperclip.sandbox.stdout"');
    expect(logs.join("")).toContain('"agentType":"codex_local"');
  });
});

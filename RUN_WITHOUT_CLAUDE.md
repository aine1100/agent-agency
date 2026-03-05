# Run These Agents Without Claude Code

This repo is prompt-driven. The `.md` files are agent instructions, not background services.

Use `tools/run-agent.ps1` to execute any agent file with either:
- OpenAI Responses API
- Local Ollama API

For one-command orchestration, use `tools/run-nexus-micro.ps1` (Orchestrator -> Specialist -> QA -> Reality Checker).

## 1. OpenAI path

```powershell
$env:OPENAI_API_KEY = "YOUR_KEY"

powershell -ExecutionPolicy Bypass -File .\tools\run-agent.ps1 `
  -AgentFile .\specialized\agents-orchestrator.md `
  -Task "Activate NEXUS-Micro mode for a bug-fix workflow on login timeout. Create a step-by-step plan and start with investigation." `
  -Provider openai `
  -Model gpt-4.1-mini
```

## 2. Ollama path (local model)

Start Ollama first, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-agent.ps1 `
  -AgentFile .\testing\testing-api-tester.md `
  -Task "Test API endpoints /health and /login on http://localhost:3000 and return PASS/FAIL with evidence." `
  -Provider ollama `
  -Model llama3.1
```

## 3. NEXUS-Micro pattern (manual chain)

Run agents in sequence for a targeted workflow:

1. `specialized/agents-orchestrator.md` (assigns flow + quality gates)
2. domain agent (for example `engineering/engineering-backend-architect.md`)
3. `testing/testing-evidence-collector.md` or `testing/testing-api-tester.md`
4. `testing/testing-reality-checker.md` for final decision

Use the previous output as context in the next `-Task` input.

## 4. NEXUS-Micro in one command (auto chain)

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-nexus-micro.ps1 `
  -Task "Fix auth token refresh failures on login and verify no regressions." `
  -Provider openai `
  -Model gpt-4.1-mini `
  -DomainAgentFile .\engineering\engineering-backend-architect.md
```

Outputs are saved under `.nexus-runs\nexus-micro-<timestamp>\`:
- `01-orchestrator.txt`
- `02-specialist.txt`
- `03-qa.txt`
- `04-final.txt`
- `SUMMARY.md`

## Notes

- Add `-StripFrontMatter` if your model is sensitive to YAML headers.
- Add `-DryRun` to print request payload without sending a network call.
- Override endpoints with `-OpenAIEndpoint` or `-OllamaEndpoint` if needed.

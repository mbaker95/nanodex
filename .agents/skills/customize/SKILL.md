---
name: customize
description: Modify NanoDex behavior, channels, integrations, prompts, or runtime configuration.
---

# NanoDex Customization

Use this skill when the user wants behavior changes rather than routine operation.

## Approach

1. Identify whether the change belongs in:
   - `groups/*/AGENTS.md` for behavior and memory
   - `.agents/skills/*` for repeatable Codex workflows
   - `src/` for host/runtime behavior
   - `container/agent-runner/` for container-side Codex behavior
2. Implement the code change directly.
3. Update docs when the change affects setup or usage.

## Guidance

- Built-in Codex commands already cover `/compact`, `/review`, `/clear`, `/plan`, `/agent`, and `/skills`. Do not recreate those as fake repo skills.
- Repo skills should be invoked as `$skill-name` or by natural language that clearly maps to the skill.
- Prefer editing `AGENTS.md` over reintroducing `CLAUDE.md` instructions.

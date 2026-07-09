# Project Agents

This folder contains custom VS Code Copilot agents for this repository.

## How to add a new agent

1. Create a file ending in `.agent.md` in this folder.
2. Add YAML frontmatter (`name`, `description`, optional tools/model settings).
3. Add clear behavior instructions in the body.

## Minimal template

```md
---
name: your-agent-name
description: "Use when: short trigger phrases for this agent"
---

You are a specialized agent for this project.

Goals:

- Goal 1
- Goal 2

Constraints:

- Constraint 1
- Constraint 2

Workflow:

1. Step 1
2. Step 2
```

## Notes

- Keep descriptions explicit: include the words users are likely to type.
- Prefer one purpose per agent.
- Store shared, always-on project rules in `.github/copilot-instructions.md` (optional), not inside every agent.

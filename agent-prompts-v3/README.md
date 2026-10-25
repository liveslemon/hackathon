# Agent prompts v3: executing the delivery audit

The plan, reasoning, file ownership and contracts are in
[`audit/delivery/10-implementation-plan.md`](../audit/delivery/10-implementation-plan.md).
Each `w<wave>-<agent>-*.txt` file here is **complete**: paste the whole file into one agent.

## One-time setup (before wave 1)

New worktrees only contain committed files, so commit the audit and the prompts first:

```bash
cd "/Users/macbook/Documents/Uni stuff/PAU/Tech innovation club/Hackathon2"
git checkout dev
git add CLAUDE.md audit/delivery agent-prompts-v3
git commit -m "docs: delivery audit, implementation plan and agent prompts v3"
mkdir -p audit/delivery/reports
```

## Starting a wave

Start a wave only after the previous one is merged into `dev` (tell me "wave N done" and I'll integrate it).

```bash
cd "/Users/macbook/Documents/Uni stuff/PAU/Tech innovation club/Hackathon2"
git checkout dev && git pull
WAVE=w1   # w1 | w2 | w3 | w4
for f in agent-prompts-v3/${WAVE}-*.txt; do
  b=$(basename "$f" .txt)                      # e.g. w1-21-platform
  git worktree add -b "agent/$b" "../pau-$b" dev
done
git worktree list
```

For **wave 3**, start `w3-41-shell-kit` alone. Run the loop for 42–45 only after I've merged 41.

In Antigravity, for each agent: **New Project →** open `Tech innovation club/pau-<name>`, set the worktree dropdown to the current
folder (not "New Worktree"), choose the model below, and paste the matching file.

## Agents and models

| Wave | File | Model | Start condition |
|---|---|---|---|
| 1 | w1-21-platform | Claude Sonnet 4.6 | wave 0 done |
| 1 | w1-22-identity | **Claude Opus 4.6** | wave 0 done |
| 1 | w1-23-backend-cleanup | Gemini 3.8 Flash (high) | wave 0 done |
| 1 | w1-24-state-machine | **Claude Opus 4.6** | wave 0 done |
| 1 | w1-25-matching-jobs | Claude Sonnet 4.6 | wave 0 done |
| 1 | w1-26-test-infra | Claude Sonnet 4.6 | wave 0 done |
| 1 | w1-27-cleanup | Gemini 3.8 Flash (high) | wave 0 done |
| 2 | w2-31-companies | **Claude Opus 4.6** | wave 1 merged |
| 2 | w2-32-siwes | **Claude Opus 4.6** | wave 1 merged |
| 2 | w2-33-hiring | Claude Sonnet 4.6 | wave 1 merged |
| 2 | w2-34-comms | Claude Sonnet 4.6 | wave 1 merged |
| 2 | w2-35-email-cron | Gemini 3.8 Flash (high) | wave 1 merged. **Start it first; others use its K15 commit** |
| 2 | w2-36-privacy | Claude Sonnet 4.6 | wave 1 merged |
| 3 | w3-41-shell-kit | Claude Sonnet 4.6 | wave 2 merged |
| 3 | w3-42-student | Claude Sonnet 4.6 | 41 merged |
| 3 | w3-43-employer | Claude Sonnet 4.6 | 41 merged |
| 3 | w3-44-admin | Claude Sonnet 4.6 | 41 merged |
| 3 | w3-45-public | Gemini 3.8 Flash (high) | 41 merged |
| 4 | w4-51-student-wow | Claude Sonnet 4.6 | wave 3 merged |
| 4 | w4-52-qa | Claude Sonnet 4.6 | wave 3 merged |
| 4 | w4-53-employer-wow | Gemini 3.8 Flash (high) | wave 3 merged |

Gemini 3.1 Pro (High) can replace any Sonnet slot while it's still listed. Don't use GPT-OSS for these.
Keep at most 2 Opus agents running at once. Each wave has 2.

## While agents run

- **An agent asks to touch a file it doesn't own:** answer "put it in Handoffs".
- **An agent finishes early:** let it write its report and stop. Don't give it extra work from another agent's list.
- **An agent needs a decision** (e.g. the email provider or the SSO provider): answer it, and I'll record it in `audit/delivery/reports/wave0.md`.
- **Agents must not** run `supabase db push`, backfills or deploys. If one asks, say no; that's the integrator's job.

## When a wave is done

Every agent's branch should have its report (`audit/delivery/reports/<branch>.md`) as the last commit, with a clean tree. Then tell me
"wave N done", and I'll:

- merge the branches
- run every check
- review the migrations against production
- apply to staging
- give you the production commands
- clean up the worktrees

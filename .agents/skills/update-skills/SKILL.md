---
name: update-skills
description: Refresh NanoDex repo skills or merge newer skill branches/remotes into a customized fork.
---

# Update Skills

Use this when the user wants newer repo skill content without doing a full upstream merge first.

## Steps

1. Check git status and avoid clobbering unrelated local work.
2. Fetch relevant remotes.
3. Update `.agents/skills/` content or merge the requested skill branch.
4. Rebuild docs if the skill surface changed.
5. Summarize which skills changed and any manual follow-up.

---
name: update-nanodex
description: Bring upstream NanoDex changes into a customized fork while preserving local modifications.
---

# Update NanoDex

Use this when the user wants to sync their fork with upstream.

## Steps

1. Verify the working tree state with `git status --short`.
2. Ensure `upstream` points at the correct NanoDex repo.
3. Fetch upstream and inspect incoming commits.
4. Merge or cherry-pick the requested updates.
5. Resolve conflicts carefully without reverting the user's local customizations.
6. Run the relevant build/typecheck checks and summarize drift or follow-up.

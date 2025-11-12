# HAAG Online Badge

An SVG badge for the Human-Augmented Analytics Group (HAAG), featuring a layered security tablet motif with a custom HAAG signal glyph at the core.

![Online Badge](https://github.com/jamesjyoon/badge/raw/main/assets/online-badge.svg)
## Highlights
- Deep navy backdrop with layered gradients and a luminous perimeter for screen legibility.
- Central "data aperture" filled with a hex-circuit motif and credential plate for `ID-HAAG-CORE-2024`.

Feel free to tailor the identifier strings, gradients, or typography to match other HAAG credentials, update the data hash, or localize the footer copy for different campus deployments.

## Updating the badge from Codex to GitHub
1. **Open the repository in Codex.** Start a new session that targets this project so you can inspect and edit files such as `assets/online-badge.svg` or `README.md` directly in the workspace.
2. **Modify the files.** Use Codex editing commands (`apply_patch`, `cat <<'EOF' > file`, or an editor of your choice) to update the SVG, documentation, or supporting assets. Re-run previews with `sed -n` or `cat` to confirm the content.
3. **Review your changes.** Execute `git status` and `git diff` inside the Codex terminal to make sure only the intended files were touched and that the diffs look correct.
4. **Commit locally.** Stage and commit the updates with:
   ```bash
   git add <files>
   git commit -m "Describe your change"
   ```
   Codex environments retain the commit history, so you can iterate until the message captures your work accurately.
5. **Push to GitHub.** Run `git push origin <branch-name>` with the branch you are working on. If it is a new branch, GitHub will create it for you the first time you push.
6. **Open or update a Pull Request.** Visit the repository on GitHub, select your branch, and create or refresh the PR. The diff will show the commits you produced in Codex, ready for review.

# GitHub SSH Setup (macOS, multiple accounts)

How to authenticate git with GitHub using an SSH key instead of personal
access tokens — set up once per machine, works for every repo, never expires.

Written against a real setup on 2026-07-27 (macOS, three GitHub identities:
personal `whytepeter`, work org `skaletek-io`, work org `Brisev`). Every
troubleshooting section below is a problem actually hit during that setup,
not a hypothetical.

> **Scope note:** this is *machine* setup, not project documentation. It lives
> here for convenience — move it to a dotfiles or notes repo if you'd rather
> keep this repo product-only.

---

## Why SSH instead of tokens

| | Personal access token (HTTPS) | SSH key |
| --- | --- | --- |
| Expiry | Expires; needs rotation | Never |
| Storage | Plaintext in `.git/config` or Keychain | Encrypted private key on disk |
| Leak risk | High — appears in `git remote -v`, screen shares, logs | Public half is safe to share; private half never leaves the machine |
| Per-repo work | Re-auth when it expires | None once configured |

The failure mode that motivated this: a token embedded directly in a remote
URL (`https://ghp_xxx@github.com/user/repo.git`) is printed by any
`git remote -v`, which is an easy way to leak a live credential.

---

## Part 1 — Generate the key

```bash
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/id_ed25519
```

- `ed25519` is the current recommended algorithm — shorter and stronger than RSA.
- **Set a passphrase when prompted.** Without one, anyone who copies the
  private key file gets your GitHub access with no further barrier. macOS
  will remember the passphrase (Part 2), so you type it once, ever.
- The prompt shows nothing as you type. That's normal, not a broken terminal.

This produces two files:

| File | What it is | Shareable? |
| --- | --- | --- |
| `~/.ssh/id_ed25519` | **Private** key | ❌ Never. Never paste, never commit, never display. |
| `~/.ssh/id_ed25519.pub` | **Public** key | ✅ Yes — it's designed to be handed out. |

---

## Part 2 — Configure SSH to use macOS Keychain

Create or append to `~/.ssh/config`:

```
# GitHub — key loaded from macOS Keychain so the passphrase is entered once.
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  UseKeychain yes
  AddKeysToAgent yes
```

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/config
```

- `UseKeychain yes` — pull the passphrase from macOS Keychain (Apple-specific).
- `AddKeysToAgent yes` — load the key into `ssh-agent` automatically, so it
  survives reboots.

Then load the key into the agent, saving the passphrase to Keychain:

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

Enter the passphrase once. Verify it's loaded:

```bash
ssh-add -l    # should list your key's fingerprint, not "The agent has no identities."
```

---

## Part 3 — Register the public key with GitHub

Copy the **public** key:

```bash
cat ~/.ssh/id_ed25519.pub | pbcopy
```

Then:

1. [github.com/settings/keys](https://github.com/settings/keys) — **confirm you
   are logged into the right account** (check the avatar menu). This is the
   single most common mistake when you have multiple GitHub accounts.
2. **New SSH key**
3. Title: something identifying the machine, e.g. `MacBook Pro`
4. **Key type: Authentication Key** — *not* Signing Key. A signing key only
   verifies commit signatures and cannot authenticate a git connection.
5. Paste, **Add SSH key**

Confirm the fingerprint GitHub shows matches your local one:

```bash
ssh-keygen -lf ~/.ssh/id_ed25519.pub
```

### Test it

```bash
ssh -T git@github.com
```

Success looks like:

```
Hi <username>! You've successfully authenticated, but GitHub does not provide shell access.
```

The "no shell access" part is expected — GitHub never grants a shell. Seeing
your correct username is the thing that matters.

---

## Part 4 — Point repos at SSH

### A new repo

Clone using the **SSH** URL (the SSH tab on GitHub's green *Code* button):

```bash
git clone git@github.com:username/repo.git
```

No token, no prompt. If you clone the HTTPS URL out of habit, git will ask
for a token — fix it with the `set-url` command below.

### An existing repo

```bash
git remote set-url origin git@github.com:username/repo.git
git remote -v          # verify
git ls-remote --heads origin   # verify auth actually works
```

### Many existing repos at once

⚠️ **Only convert repos belonging to the account whose key you just added.**
See the multi-account warning below.

```bash
cd ~/Documents/code && find . -maxdepth 4 -name ".git" -type d -print0 \
| while IFS= read -r -d '' g; do
    d=$(dirname "$g")
    u=$(git -C "$d" remote get-url origin 2>/dev/null) || continue
    case "$u" in
      git@github.com:YOURNAME/*) ;;                       # already SSH
      *github.com*YOURNAME/*)
        p=$(echo "$u" | sed -E 's#.*github\.com[:/]##; s#\.git$##')
        git -C "$d" remote set-url origin "git@github.com:${p}.git"
        echo "converted: ${d#./}"
        ;;
    esac
  done
```

Replace `YOURNAME` with your GitHub username. Notes on why it's written this
way:

- `-maxdepth 4` — repos are often nested (`glown/glown-web-admin`), so a plain
  `for d in */` only catches top-level ones and silently misses the rest.
- `-print0` / `read -d ''` — handles directory names containing spaces
  (e.g. `Interview Prep/`).
- The `case` match on `YOURNAME/` is what protects other accounts' repos.

Audit what you have before and after:

```bash
find ~/Documents/code -maxdepth 4 -name ".git" -type d | while read -r g; do
  d=$(dirname "$g")
  u=$(git -C "$d" remote get-url origin 2>/dev/null) || continue
  printf "%-45s %s\n" "${d#$HOME/Documents/code/}" "$u"
done | sort -k2
```

---

## ⚠️ Multiple GitHub accounts

**Do NOT do this:**

```bash
# DANGEROUS with more than one GitHub account
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

That rewrites *every* GitHub HTTPS URL on the machine to SSH, forcing work
and client repos through your personal key. Best case they break; worse case
pushes silently authenticate as the wrong identity.

Instead, convert only your own repos (Part 4) and leave the others on HTTPS.

### If you need SSH for a second account too

One key per account, distinguished by a host alias:

```bash
ssh-keygen -t ed25519 -C "work@company.com" -f ~/.ssh/id_ed25519_work
```

`~/.ssh/config`:

```
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  UseKeychain yes
  AddKeysToAgent yes

Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work
  UseKeychain yes
  AddKeysToAgent yes
```

Add `id_ed25519_work.pub` to the work account, then point work repos at the
alias:

```bash
git remote set-url origin git@github-work:org/repo.git
```

The hostname `github-work` isn't real — SSH resolves it via the config to
`github.com` while selecting the correct key.

Also set the right commit identity per repo so work commits aren't attributed
to your personal email:

```bash
git config user.email "work@company.com"
```

Or automate it by directory in `~/.gitconfig`:

```
[includeIf "gitdir:~/Documents/code/work/"]
  path = ~/.gitconfig-work
```

---

## Troubleshooting

### `Permission denied (publickey)` — but the key IS on GitHub

Check the agent first:

```bash
ssh-add -l
```

If it says **"The agent has no identities"**, that's the cause. With a
passphrase-protected key and no agent, SSH offers the public key, GitHub asks
it to prove possession, and SSH can't decrypt the private key without
prompting. In any non-interactive context (scripts, IDE integrations, agent
tools) there's no TTY to prompt on, so it fails — with an error identical to
"key not registered."

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

Only if the agent *does* hold the key should you investigate:

- Key added to the **wrong account** — check the avatar on the keys page.
- Key added as a **Signing Key** rather than an Authentication Key.
- Fingerprint mismatch — compare `ssh-keygen -lf ~/.ssh/id_ed25519.pub`
  against what GitHub lists.

Diagnose which key is actually being offered:

```bash
ssh -vT git@github.com 2>&1 | grep -iE "offering|denied"
```

### `git push` fails with no prompt at all

Stale credentials cached in Keychain — git keeps auto-trying invalid ones and
never reaches a prompt. There are often **several** stacked up.

```bash
# Remove all cached github.com credentials (output suppressed on purpose)
while security find-internet-password -s github.com >/dev/null 2>&1; do
  security delete-internet-password -s github.com >/dev/null 2>&1
done
```

> 🔒 **Always redirect the output of `security find-internet-password` /
> `delete-internet-password`.** Both print the stored secret in the `acct`
> field — *even without the `-g` flag* — so running them bare will dump a live
> token into your terminal, scrollback, and any screen recording. To test
> existence only:
> ```bash
> security find-internet-password -s github.com >/dev/null 2>&1; echo $?
> ```

### `Permission to X denied to Y`

A cached credential for the wrong account. Clear it as above, then re-auth.

### `remote: This repository moved`

Update the remote to the current name:

```bash
git remote set-url origin git@github.com:username/new-repo-name.git
```

### Key stops working after reboot

`AddKeysToAgent yes` + `UseKeychain yes` must both be in `~/.ssh/config`
(Part 2). If they are and it still drops, re-run:

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

---

## If a token was ever exposed

Tokens are **not** single-use — a leaked `ghp_…` stays valid for anyone who
has it until explicitly revoked or expired.

1. Revoke it at [github.com/settings/tokens](https://github.com/settings/tokens)
   — check *every* account you own, since a cached token may belong to a
   different one than you expect.
2. Remove it from any remote URL:
   ```bash
   git remote set-url origin git@github.com:username/repo.git
   ```
3. Purge Keychain (see above).
4. If it was ever committed, rotating is mandatory — git history preserves it
   even after the file is deleted.

---

## Quick reference

```bash
ssh-keygen -t ed25519 -C "email" -f ~/.ssh/id_ed25519   # generate
ssh-add --apple-use-keychain ~/.ssh/id_ed25519           # load + save passphrase
ssh-add -l                                               # what's loaded
cat ~/.ssh/id_ed25519.pub | pbcopy                       # copy PUBLIC key
ssh -T git@github.com                                    # test auth
ssh-keygen -lf ~/.ssh/id_ed25519.pub                     # fingerprint
git remote set-url origin git@github.com:user/repo.git   # switch a repo
git ls-remote --heads origin                             # verify auth works
```

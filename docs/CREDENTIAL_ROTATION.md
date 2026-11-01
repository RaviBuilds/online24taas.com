# Credential rotation (WordPress + hosting)

**Status: prepared, NOT executed.** Executing it needs access this environment does not have: the hosting control panel
(cPanel / MySQL) and a way to edit `wp-config.php` on the live server. The credentials that appear in the WordPress backup
must not be used from here to "test" them (that would be unauthorised access to a third-party system). Everything below is
done by the site owner, in this order, in one sitting (about 15 minutes).

Note: at the time of writing `online24taas.com` does not resolve in DNS from this environment, so the WordPress site may already be offline;
the steps still apply because the same passwords may be reused elsewhere and the files are in backups and cloud-synced folders.

## What was exposed (names only; the values are not repeated here)

| Where | What |
|---|---|
| `online24taas/wp-config.php` | database name, user and **password**; the eight WordPress **keys and salts** |
| `online24taas/APP-META.INI` | the same database password, hosting username, an admin e-mail |
| `online24taas/online24taas.txt` | WordPress admin login and **password**, an FTP login and **password**, a database user name/password |
| `online24taas/online24taas.com credentials.jpg` | screenshot of credentials |
| `online24taas/filezillaa/…` | FileZilla site manager export (may hold saved FTP passwords) |
| `online24taas-web/.env.rehearsal.local` (git-ignored) | a Viewer token for the old rehearsal Sanity project `qvtcbb1j` |

None of these are in the Git repository (verified: all commits scanned, see the Phase 4 report).

## Procedure

1. **Hosting account** (the control panel that hosts `public_html`): change the account password; enable 2-step verification.
2. **FTP/SFTP**: delete the FTP account that is in `online24taas.txt` and create a new one only if needed (SFTP/keys preferred). Remove saved passwords from FileZilla.
3. **Database password** (do this and step 4 within one minute to avoid an outage):
   1. In the panel → MySQL Databases, set a new strong password for the WordPress database user (or use phpMyAdmin: `SET PASSWORD`).
   2. Immediately edit `wp-config.php` on the server: `DB_PASSWORD` = the new value. Reload the site and confirm it works.
   3. If anything fails, put the old password back in both places; nothing else was changed yet.
4. **Salts/keys**: open `https://api.wordpress.org/secret-key/1.1/salt/`, copy the eight lines over the old `define('AUTH_KEY' …` block in `wp-config.php`. All logged-in users are signed out once; that is expected.
5. **WordPress users**: change the password of every administrator; remove unused users; enable 2FA if a plugin provides it.
6. **Delete the files** that hold secrets from the backup/working folders after storing the new values in a password manager:
   `online24taas.txt`, `online24taas.com credentials.jpg`, the FileZilla export, `APP-META.INI` (or redact it); check that these folders are not synced to a cloud drive.
7. **Other places where the same password may be reused**: e-mail accounts on the domain, Cloudflare/registrar, Google account of `ajitlatake41@gmail.com`, AdSense, Search Console. Change any that match.
8. **After DNS cut-over** the WordPress host can be shut down; if it is kept as a rollback, keep it behind a new password and with plugins updated (the backup shows `version-updates-available=1`).
9. **Sanity**: revoke `online24taas-migration-test-read` (Viewer) in project `qvtcbb1j` (manage.sanity.io, signed in as the account that owns it) and delete dataset `migration-test` there if not needed; remove the stale local `.env.rehearsal.local`.

## Already done (Phase 4)

* Sanity project `mkiaioc7`: the robot token **"MCP agent read/write" (Editor) was revoked** on 2026-11-01. Evidence it was unused: none of the MCP client configurations on this machine
  (VS Code, Cursor, Claude, Cline, Copilot CLI) reference a robot token (all use the owner's personal token); none of the 96 write transactions on 791 documents were authored by a robot member.
  The read-only "MCP agent readonly" (Viewer) token was left in place; it grants no write access and the dataset is public-read anyway. Recreate the Editor token in manage.sanity.io → API → Tokens if an MCP agent needs write access again.
* Vercel: the revalidate secrets for Preview and Production are different random 256-bit values stored as *sensitive* variables.

## Verify afterwards

* The site loads, you can log in at `/wp-login.php`, and old cookies no longer work.
* `git grep` / the backup folders contain none of the old values.

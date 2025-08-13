# ZoteroQuickLookNG (Zotero 7) — 2.1.7 Release Kit

This repo template lets you publish **ZoteroQuickLookNG-z7-2.1.7-release.xpi** on GitHub with auto‑updates.

## Quick start
1. Put your built XPI at `dist/ZoteroQuickLookNG-z7-2.1.7-release.xpi`.
2. In your XPI’s `manifest.json`, set:
   ```json
   {
     "applications": {
       "zotero": {
         "id": "ZoteroQuickLookNG@beaugunderson.com",
         "strict_min_version": "6.999",
         "strict_max_version": "7.0.*",
         "update_url": "https://github.com/<OWNER>/<REPO>/releases/download/release/update.json"
       }
     }
   }
   ```
   Replace `<OWNER>/<REPO>` with your GitHub path.
3. Commit and tag:
   ```bash
   git add .
   git commit -m "Release 2.1.7"
   git tag v2.1.7
   git push origin main --tags
   ```
4. The workflow will:
   - upload your XPI to the `v2.1.7` release,
   - generate `update.json` with SHA‑256,
   - publish `update.json` to the static `release` tag URL above.

## macOS permissions (Finder mode)
System Settings → Privacy & Security:
- **Accessibility** → enable **Zotero**.
- **Automation** → under **Zotero**, allow **Finder** and **System Events**.

## License
MIT (or your choice).

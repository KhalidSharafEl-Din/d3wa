#!/usr/bin/env bash
# Point the site at a different origin.
#
# The og:url, og:image and canonical tags have to be absolute, so the current
# origin is baked into every page. This rewrites all of them at once, in either
# direction, so moving between GitHub Pages and a custom domain is one command.
#
#   ./scripts/set-domain.sh https://d3wa.io
#   ./scripts/set-domain.sh https://khalidsharafel-din.github.io/d3wa    # go back
#
# Run it from the repo root. Re-running with the same value is a no-op.

set -euo pipefail

NEW="${1:-}"
if [ -z "$NEW" ]; then
  echo "usage: $0 <new-base-url>            e.g. $0 https://d3wa.io" >&2
  exit 64
fi
NEW="${NEW%/}"                                   # tolerate a trailing slash

case "$NEW" in
  https://*) ;;
  *) echo "error: base URL must start with https:// (got '$NEW')" >&2; exit 64 ;;
esac

cd "$(dirname "$0")/.."

# Detect what the pages currently point at, so this works in both directions.
OLD=$(sed -n 's|.*<link rel="canonical" href="\(https://[^"]*\)/*".*|\1|p' index.html | head -1)
OLD="${OLD%/}"
if [ -z "$OLD" ]; then
  echo "error: could not read the current base URL from index.html" >&2
  exit 1
fi

if [ "$OLD" = "$NEW" ]; then
  echo "Already pointing at $NEW — nothing to do."
  exit 0
fi

echo "Rewriting $OLD  ->  $NEW"

OLD="$OLD" NEW="$NEW" python3 - <<'PY'
import os, pathlib, re

old, new = os.environ["OLD"], os.environ["NEW"]
# On a custom domain the site sits at the root; on Pages it lives under /d3wa.
old_path = re.sub(r"^https://[^/]+", "", old) or "/"
new_path = re.sub(r"^https://[^/]+", "", new) or "/"
if not old_path.endswith("/"): old_path += "/"
if not new_path.endswith("/"): new_path += "/"

targets = ["index.html", "order.html", "studio.html", "admin.html", "404.html"]
targets += sorted(str(p) for p in pathlib.Path("demos").glob("*.html"))

total_files = total_edits = 0
for name in targets:
    p = pathlib.Path(name)
    if not p.exists():
        continue
    src = p.read_text(encoding="utf-8")
    out = src.replace(old, new)

    # Root-relative links (the 404 "back home" button) follow the same move.
    if old_path != new_path:
        out = out.replace(f'href="{old_path}"', f'href="{new_path}"')

    # The link shown to the customer while they build their invitation. Only a
    # real custom domain can serve those slugs, so a github.io target leaves the
    # intended domain in place rather than advertising a host that can't host them.
    if "github.io" not in new:
        out = re.sub(r'(var PUBLIC_HOST = ")[^"]*(")',
                     lambda m: m.group(1) + re.sub(r"^https://", "", new).rstrip("/") + m.group(2),
                     out)

    if out != src:
        edits = sum(1 for a, b in zip(src.split("\n"), out.split("\n")) if a != b)
        p.write_text(out, encoding="utf-8")
        print(f"  {name:<26} {edits} line(s)")
        total_files += 1
        total_edits += edits

print(f"\n{total_files} file(s), {total_edits} line(s) changed.")
PY

echo
echo "Check it over, then:"
echo "  git diff --stat"
echo "  git commit -am 'Point the site at ${NEW}' && git push"

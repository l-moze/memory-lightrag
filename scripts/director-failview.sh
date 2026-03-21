#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="${1:-/tmp/openclaw/openclaw-$(date -u +%F).log}"
N="${2:-3000}"

if [[ ! -f "$LOG_FILE" ]]; then
  echo "log file not found: $LOG_FILE" >&2
  exit 1
fi

echo "== Director Fail View =="
echo "log: $LOG_FILE"
echo "window: last $N lines"
echo

TMP=$(mktemp)
tail -n "$N" "$LOG_FILE" > "$TMP"

echo "-- Summary (director lane errors) --"
grep -o 'FailoverError: [^"]*' "$TMP" \
  | sed 's/FailoverError: //' \
  | sed 's/[[:space:]]\+/ /g' \
  | sort | uniq -c | sort -nr || true

echo

echo "-- Coarse provider/model guess (from current director session) --"
openclaw status --deep 2>/dev/null \
  | awk '/agent:director:main/{print; found=1} END{if(!found) print "agent:director:main session not found"}' || true

echo

echo "-- Recent director failures (latest 20) --"
grep 'lane task error: lane=session:agent:director:main' "$TMP" | tail -n 20 || true

echo

echo "-- Recent global hard failures (latest 20) --"
grep -E 'Your request was blocked|API rate limit reached|HTTP 502|timed out' "$TMP" | tail -n 20 || true

rm -f "$TMP"

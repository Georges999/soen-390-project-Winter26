#!/usr/bin/env bash
# Writes frontend coverage from lcov.info to GITHUB_STEP_SUMMARY and to stdout.
# Usage: LCOV_FILE=frontend/coverage/lcov.info bash coverage-to-summary.sh

set -e
LCOV="${LCOV_FILE:-frontend/coverage/lcov.info}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"

append() {
  echo "$1" >> "$SUMMARY"
  echo "$1"
}

append "## Frontend coverage"
append ""

if [ ! -f "$LCOV" ]; then
  append "No \`lcov.info\` found at \`$LCOV\`."
  exit 0
fi

total_lf=0
total_lh=0
file_lf=0
file_lh=0
current_file=""

append "| File | Lines | Covered | % |"
append "|------|------:|--------:|--:|"

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    SF:*) current_file="${line#SF:}"; file_lf=0; file_lh=0 ;;
    LF:*) file_lf="${line#LF:}"; total_lf=$((total_lf + file_lf)) ;;
    LH:*)
      file_lh="${line#LH:}"
      total_lh=$((total_lh + file_lh))
      name=$(basename "$current_file")
      if [ "$file_lf" -gt 0 ]; then
        pct=$((file_lh * 100 / file_lf))
      else
        pct=100
      fi
      append "| \`$name\` | $file_lf | $file_lh | ${pct}% |"
      ;;
  esac
done < "$LCOV"

append ""
if [ "$total_lf" -gt 0 ]; then
  pct=$((total_lh * 100 / total_lf))
  append "**Total: $total_lh / $total_lf lines ($pct%)**"
fi
append ""
append "Full report is also sent to SonarCloud (see **SonarCloud report** job)."

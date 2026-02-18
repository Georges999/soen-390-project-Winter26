#!/usr/bin/env bash
# Writes frontend coverage table to stdout (and to GITHUB_STEP_SUMMARY when set).
# Usage: LCOV_FILE=frontend/coverage/lcov.info bash coverage-to-summary.sh

set -e
LCOV="${LCOV_FILE:-frontend/coverage/lcov.info}"
SUMMARY="${GITHUB_STEP_SUMMARY:-}"

# Fixed-width columns: File 36, Lines 8, Covered 8, % 6
row() {
  printf "%-36s %8s %8s %6s\n" "$1" "$2" "$3" "$4"
}

if [ ! -f "$LCOV" ]; then
  echo "No lcov.info found at $LCOV"
  exit 0
fi

# Collect rows first so we can print an aligned table
total_lf=0
total_lh=0
file_lf=0
file_lh=0
current_file=""
declare -a names
declare -a lfs
declare -a lhs
declare -a pcts

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
      names+=("$name")
      lfs+=("$file_lf")
      lhs+=("$file_lh")
      pcts+=("$pct")
      ;;
  esac
done < "$LCOV"

# Print table to stdout (visible in the Coverage report step — last step)
echo "Frontend coverage"
echo ""
row "File" "Lines" "Covered" "%"
row "------------------------------------" "--------" "--------" "------"

for i in "${!names[@]}"; do
  row "${names[$i]}" "${lfs[$i]}" "${lhs[$i]}" "${pcts[$i]}%"
done

if [ "$total_lf" -gt 0 ]; then
  pct=$((total_lh * 100 / total_lf))
  echo ""
  row "Total" "$total_lf" "$total_lh" "${pct}%"
fi

# When running in a job that has GITHUB_STEP_SUMMARY, append the same table there
if [ -n "$SUMMARY" ]; then
  {
    echo ""
    echo "## Frontend coverage"
    echo ""
    echo '```'
    row "File" "Lines" "Covered" "%"
    row "------------------------------------" "--------" "--------" "------"
    for i in "${!names[@]}"; do
      row "${names[$i]}" "${lfs[$i]}" "${lhs[$i]}" "${pcts[$i]}%"
    done
    if [ "$total_lf" -gt 0 ]; then
      pct=$((total_lh * 100 / total_lf))
      echo ""
      row "Total" "$total_lf" "$total_lh" "${pct}%"
    fi
    echo '```'
  } >> "$SUMMARY"
fi

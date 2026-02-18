#!/usr/bin/env bash
# Appends SonarCloud report link to the job summary.
set -e
if [ -n "$GITHUB_STEP_SUMMARY" ]; then
  {
    echo "## SonarCloud report"
    echo ""
    echo "**[View report](https://sonarcloud.io/dashboard?id=campus-guide-frontend)**"
  } >> "$GITHUB_STEP_SUMMARY"
  echo "SonarCloud link added to job summary."
else
  echo "**[View report](https://sonarcloud.io/dashboard?id=campus-guide-frontend)**"
fi

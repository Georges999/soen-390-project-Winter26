#!/usr/bin/env bash
# Appends SonarCloud report link to the job summary.
# Reads project key from sonar-project.properties (repo root).
set -e
PROPS="${SONAR_PROPS:-sonar-project.properties}"
if [ -f "$PROPS" ]; then
  PROJECT_KEY=$(grep '^sonar.projectKey=' "$PROPS" | cut -d= -f2-)
else
  PROJECT_KEY=""
fi
if [ -z "$PROJECT_KEY" ]; then
  PROJECT_KEY="campus-guide-frontend"
fi
URL="https://sonarcloud.io/project/overview?id=${PROJECT_KEY}"
if [ -n "$GITHUB_STEP_SUMMARY" ]; then
  {
    echo "## SonarCloud report"
    echo ""
    echo "**[View report](${URL})**"
  } >> "$GITHUB_STEP_SUMMARY"
  echo "SonarCloud link added to job summary."
else
  echo "**[View report](${URL})**"
fi

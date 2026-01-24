# GitHub Actions Workflows

This folder contains CI/CD automation for the project.

Each workflow is seperated, meaning that if we only edited backend code, only the backend yml will be tested, same for frontend, caching is removed for now, as we didnt choose waht packages we want to work on yet, so I should re-add caching once packages are decided. 
## Workflows

### backend-ci.yml
Runs automated tests and linting for backend code.

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Only runs when backend files change

**What it does:**
1. Installs Node.js and dependencies
2. Runs ESLint to check code style
3. Runs all tests
4. Verifies 70% code coverage requirement

**Result:** PR will show a green checkmark if all pass, red X if anything fails.

---

### frontend-ci.yml
Runs automated tests and linting for frontend code.

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Only runs when frontend files change

**What it does:**
1. Installs Node.js and dependencies
2. Runs ESLint to check code style
3. Runs all tests
4. Verifies 70% code coverage requirement

**Result:** PR will show a green checkmark if all pass, red X if anything fails.

---

## How It Works

When you open a PR on GitHub:
1. GitHub automatically runs these workflows
2. You'll see status checks at the bottom of your PR
3. Must pass before merging (if branch protection is enabled)

## Local Testing

Before pushing, run locally to catch issues:

```bash
# Backend
cd backend
npm run lint
npm test

# Frontend
cd frontend
npm run lint
npm test
```

## Troubleshooting

**Workflow fails on "Install dependencies":**
- Make sure `package-lock.json` is committed

**Workflow fails on "Run linter":**
- Run `npm run lint -- --fix` locally to auto-fix issues

**Workflow fails on "Check coverage":**
- Add more tests to reach 70% coverage
- Run `npm run test:coverage` locally to see what's missing

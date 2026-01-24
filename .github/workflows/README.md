# GitHub Actions Workflows

This folder contains CI/CD automation for the project.
Each workflow is seperated, meaning that if we only edited backend code, only the backend yml will 
be tested, same for frontend,
## Current Status

**NOTE:** Most workflow steps are currently commented out. This is intentional since the project is in early setup phase.

**Uncomment steps when:**
1. **Dependencies:** After packages are finalized and conflicts resolved
2. **Linting:** After ESLint config is added (run `npm init @eslint/config`)
3. **Tests:** After tests are written
4. **Coverage:** After you want to enforce 70% coverage requirement

---

## Workflows

### backend-ci.yml
Will run automated tests and linting for backend code (when uncommented).

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Only runs when backend files change

**What it will do (when uncommented):**
1. Installs Node.js and dependencies
2. Runs ESLint to check code style
3. Runs all tests
4. Verifies 70% code coverage requirement

---

### frontend-ci.yml
Will run automated tests and linting for frontend code (when uncommented).

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Only runs when frontend files change

**Known Issue to Fix First:**
- `react-native-maps` requires react >= 18.3.1
- Current `package.json` has react@18.2.0
- Fix: Update react version or adjust react-native-maps version

**What it will do (when uncommented):**
1. Installs Node.js and dependencies
2. Runs ESLint to check code style
3. Runs all tests
4. Verifies 70% code coverage requirement

---

## Setup Checklist

Before uncommenting workflow steps, complete these tasks:

### Backend Setup
- [ ] Finalize package.json dependencies
- [ ] Run `npm init @eslint/config` to create ESLint config
- [ ] Write initial tests
- [ ] Uncomment workflow steps in backend-ci.yml

### Frontend Setup
- [ ] Fix dependency conflicts (react version vs react-native-maps)
- [ ] Run `npm init @eslint/config` to create ESLint config
- [ ] Write initial tests
- [ ] Uncomment workflow steps in frontend-ci.yml

---

## How It Works

When you open a PR on GitHub:
1. GitHub automatically runs these workflows
2. You'll see status checks at the bottom of your PR
3. Currently just checks out code and sets up Node.js (will pass)
4. Once you uncomment steps, it will run tests/linting

---

## Local Testing (For Future)

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

---

## Troubleshooting (For Future)

**Workflow fails on "Install dependencies":**
- Check for dependency conflicts in package.json
- Make sure all peer dependencies are satisfied

**Workflow fails on "Run linter":**
- Run `npm run lint -- --fix` locally to auto-fix issues
- Ensure `.eslintrc` config exists

**Workflow fails on "Check coverage":**
- Add more tests to reach 70% coverage
- Run `npm run test:coverage` locally to see what's missing

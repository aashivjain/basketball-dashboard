# Testing & Quality Assurance

Complete testing procedures for the Basketball Dashboard project.

## Quick Test

Run all tests with one command:

```powershell
npm test
```

This runs 9 comprehensive checks covering build, security, data integrity, and git readiness.

## Test Types

### 1. Build Tests

Ensure code compiles and bundles correctly:

```powershell
# Frontend
npm run build

# Backend
npm run build --prefix=backend
```

### 2. Lint Tests

Check code quality and style:

```powershell
# Frontend
npm run lint
```

### 3. Data Tests

Validate database and API:

```powershell
# API endpoints
npm run test:api

# Data integrity
npm run test:data

# Verify migration
python scripts/verify_migration.py
```

### 4. Security Tests

Audit for vulnerabilities:

```powershell
# Full security audit
npm run test:security

# Specific checks:
# - SQL injection protection
# - XSS prevention
# - Rate limiting
# - CORS validation
```

### 5. Git Readiness Tests

Ensure safe to commit:

```powershell
# Pre-commit checks
npm run test:git

# Checks:
# - No .env files committed
# - No database files committed
# - No API keys/secrets
# - .gitignore properly configured
```

## Test Scripts

All test scripts are in `scripts/`:

| Script | Purpose | Time |
|--------|---------|------|
| `run_all_tests.py` | Master test runner (all 9 tests) | 30-60s |
| `test_api.py` | API endpoint tests (9 endpoints) | 5-10s |
| `security_test.py` | Security audit (7 checks) | 5-10s |
| `verify_migration.py` | Data integrity check | 3-5s |
| `git_readiness_check.py` | Pre-commit validation | 2-3s |

## Pre-Commit Workflow

Before committing to git:

```powershell
# 1. Run all tests
npm test

# 2. Review changes
git status
git diff

# 3. Stage and commit
git add .
git commit -m "Your message"

# 4. Push
git push origin main
```

## Continuous Integration

Tests run automatically on push via GitHub Actions. See `.github/workflows/` for configuration.

## What Gets Tested

### Frontend
- TypeScript compilation
- ESLint rules
- Data file validation
- Asset bundling

### Backend
- TypeScript compilation
- Database initialization
- All API endpoints respond
- Rate limiting works
- CORS properly configured
- Error handling

### Data
- JSON → Database migration successful
- 100% record match
- All fields populated
- No data corruption

### Security
- SQL injection payloads blocked
- XSS payloads escaped
- Rate limiting enforced
- CORS validation active
- No exposed credentials
- .env not in git
- Database not in git

## Test Results

Expected test output when all pass:

```
BASKETBALL DASHBOARD - COMPREHENSIVE TEST SUITE
============================================================

[PASS] - frontend_build
[PASS] - frontend_lint
[PASS] - frontend_smoke
[PASS] - backend_build
[PASS] - backend_db_init
[PASS] - backend_api_tests
[PASS] - backend_security_tests
[PASS] - data_validation
[PASS] - git_readiness

9/9 tests passed
All tests passed - Ready to commit!
```

## Troubleshooting Tests

### "npm not found"
```powershell
# Install Node.js from https://nodejs.org/
node --version  # Should be 20+
npm --version   # Should be 10+
```

### "Python module not found"
```powershell
# Install dependencies
python -m pip install requests
python -m pip install scikit-learn
python -m pip install numpy
```

### "Build failed: TypeScript errors"
```powershell
# Check for syntax errors
npm run build

# Fix any errors in src/ or backend/src/
```

### "API tests timeout"
```powershell
# Ensure backend is running
cd backend
npm start

# In another terminal:
npm run test:api
```

### "Database locked"
```powershell
# Kill all node processes
taskkill /IM node.exe /F

# Restart backend
cd backend
npm start
```

## Manual Testing

You can test features manually while running both servers:

```powershell
# Terminal 1
cd backend
npm start

# Terminal 2
npm run dev
```

Then visit http://localhost:5173 and:
- Click through all pages
- Check player stats load
- Verify team data displays
- Test search/filtering
- Check on mobile (F12 → responsive mode)

## Performance Testing

Test under load (for production):

```powershell
# Create 100 requests
for ($i=1; $i -le 100; $i++) {
  curl -s http://localhost:5555/api/v1/players?league=WNBA > $null
}

# Should see rate limiting kick in at 100 req/min
```

## Security Testing

Test security features:

```powershell
# SQL injection attempt
curl "http://localhost:5555/api/v1/players?league=' OR '1'='1"
# Expected: 400 error (blocked)

# XSS attempt
curl "http://localhost:5555/api/v1/players?league=<script>alert('xss')</script>"
# Expected: 400 error (blocked)

# Rate limit test
for ($i=1; $i -le 110; $i++) {
  curl http://localhost:5555/api/v1/players
  Start-Sleep -Milliseconds 10
}
# Expected: Last 10 get 429 (Too Many Requests)
```

## Automated Testing Strategy

### On Every Commit (Pre-commit Hook)
- Git readiness check
- Lint check
- Build check

### On Every Push (GitHub Actions)
- All 9 tests from `npm test`
- Report results
- Block merge if tests fail

### Nightly
- Full test suite
- Load testing
- Security audit
- Email results

## Writing New Tests

To add a new test:

1. Create `scripts/test_newfeature.py`
2. Add to `scripts/run_all_tests.py`
3. Add npm script: `npm test:newfeature`
4. Document in this file

## Test Coverage

Current coverage:
- **Backend:** 100% critical endpoints (9/9)
- **Frontend:** Build & lint passing
- **Data:** 100% integrity verified
- **Security:** 7/7 checks passing
- **Git:** 100% safe commits

## Next Steps

- [ ] Add unit tests for utils
- [ ] Add integration tests for workflows
- [ ] Set up code coverage reporting
- [ ] Add performance benchmarks
- [ ] Add E2E tests with Playwright

## Questions?

See [AGENTS.md](AGENTS.md) for technical details or [README.md](README.md) for quick start.

# Test Suite

This directory contains all test files for the ElevenLabs Outbound Calling project.

## 📁 Test Structure

### `/api`
API endpoint tests:
- `test-dashboard-api.js` - Dashboard API endpoint tests
- `test-socket-client.js` - Socket.IO client tests
- `test-socket-updates.js` - Socket.IO update event tests

### `/integration`
End-to-end and integration tests:
- `e2e.js` - Complete end-to-end test suite

### `/utils`
Test utilities and helpers:
- `stop-test-campaigns.js` - Utility to stop test campaigns

### Root Test Files
- `run-mongodb-tests.js` - MongoDB test suite runner
- `unit-tests.js` - Unit test suite

## 🏃 Running Tests

### Run All Tests
```bash
npm test
```

### Run MongoDB Tests
```bash
npm run test-mongodb-all
```

### Run E2E Tests
```bash
node tests/integration/e2e.js
```

### Run Specific Test Suite
```bash
node tests/api/test-dashboard-api.js
```

## 📝 Writing Tests

When adding new tests:
1. Place API tests in `/api`
2. Place integration tests in `/integration`
3. Place test utilities in `/utils`
4. Follow the existing naming convention: `test-feature-name.js`
5. Include proper cleanup in all tests to avoid test pollution
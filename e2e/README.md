# Guest Chat E2E Tests

Comprehensive end-to-end tests for the Guest Chat system using Playwright.

## Overview

This test suite validates the complete guest chat experience from login to conversation, covering:

- **Guest Login Flow**: Authentication, validation, error handling
- **Messaging**: Send/receive, typing indicators, markdown formatting
- **Advanced Features**: Follow-up suggestions, entity tracking, context preservation
- **Error Scenarios**: Network errors, retries, session handling
- **Mobile Testing**: Responsive layouts, touch interactions, keyboard handling

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
pnpm dlx playwright install
```

### 2. Setup Test Data

Before running tests, create a test reservation in the database:

```bash
pnpm run test:e2e:setup
```

This creates a test user with credentials:
- **Check-in Date**: 2025-10-05
- **Phone Last 4**: 1234
- **Guest Name**: Test Guest

### 3. Run Tests

```bash
# Run all E2E tests
pnpm run test:e2e

# Run tests in UI mode (interactive)
pnpm run test:e2e:ui

# Run specific test file
pnpm run test:e2e -- guest-login.spec.ts

# Run tests in headed mode (see browser)
pnpm run test:e2e:headed

# Run tests on specific browser
pnpm run test:e2e -- --project=chromium
pnpm run test:e2e -- --project=mobile-chrome

# Generate HTML report
pnpm run test:e2e:report
```

## Test Structure

```
e2e/
├── fixtures/
│   └── test-data.ts          # Test data and configuration
├── helpers/
│   └── chat-helpers.ts       # Reusable test utilities
├── setup/
│   └── test-database-setup.ts # Database setup script
├── guest-login.spec.ts       # Login flow tests
├── guest-chat-messaging.spec.ts # Core messaging tests
└── guest-chat-advanced.spec.ts  # Advanced features tests
```

## Test Files

### guest-login.spec.ts

Tests the authentication flow:
- Form validation (date, phone)
- Successful login
- Invalid credentials error
- Network error handling
- Mobile-friendly layout
- Keyboard navigation
- Accessibility

### guest-chat-messaging.spec.ts

Tests core messaging functionality:
- Welcome message display
- Send message and receive response
- Tourism queries with business info
- Accommodation queries
- Conversation context preservation
- Typing indicators
- Multiline messages
- Keyboard shortcuts
- Auto-scroll
- Markdown formatting
- Chat history persistence
- Response time measurement

### guest-chat-advanced.spec.ts

Tests advanced features:
- Follow-up suggestions display and interaction
- Entity tracking and badges
- Error handling and retry
- Network failures
- Session expiration
- API errors
- Conversation persistence
- Mobile keyboard handling
- Touch gestures
- Viewport changes

## Configuration

### playwright.config.ts

- **Base URL**: `http://localhost:3000` (configurable via `BASE_URL` env var)
- **Timeout**: 30s per test, 10s for assertions
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, Tablet
- **Reporters**: HTML, List, JSON
- **Web Server**: Automatically starts dev server before tests

### Test Data

Located in `e2e/fixtures/test-data.ts`:
- Test credentials
- Sample queries
- Expected responses
- Selectors
- Timeouts
- Viewports

Modify this file to update test data without changing test code.

## Helper Functions

Located in `e2e/helpers/chat-helpers.ts`:

```typescript
// Authentication
loginAsGuest(page, checkInDate?, phoneLast4?)
logout(page)

// Messaging
sendMessage(page, message)
waitForAiResponse(page)
getLastAssistantMessage(page)
getAllMessages(page)

// Interactions
clickFollowUpSuggestion(page, index)
clickEntityBadge(page, entityName)

// Assertions
assertMessageContains(page, text)
assertHasMarkdownFormatting(page)

// Utilities
measureResponseTime(page, message)
simulateNetworkError(page)
restoreNetwork(page)
takeScreenshot(page, name)
```

## Mobile Testing

Tests run on multiple viewports:
- **Mobile Small**: 375x667 (iPhone SE)
- **Mobile Large**: 414x896 (iPhone XR)
- **Tablet**: 1024x1366 (iPad Pro)
- **Desktop**: 1920x1080

Mobile-specific tests:
- Touch target sizes (minimum 44px)
- Keyboard handling
- Touch gestures
- Viewport orientation changes

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: pnpm dlx playwright install --with-deps
      - run: pnpm run test:e2e:setup
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
      - run: pnpm run test:e2e
        env:
          CI: true
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests Failing with "No reservation found"

Run the setup script:
```bash
pnpm run test:e2e:setup
```

### Server Not Starting

Ensure port 3000 is free:
```bash
lsof -ti:3000 | xargs kill -9
```

### Timeouts on Slow Networks

Increase timeouts in `playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

### Browser Not Launching

Reinstall browsers:
```bash
pnpm dlx playwright install --force
```

### Mobile Tests Failing

Check viewport configuration in test:
```typescript
test.use({ viewport: { width: 375, height: 667 } })
```

## Best Practices

1. **Use Helpers**: Prefer helper functions over direct page interactions
2. **Assertions**: Use meaningful assertion messages
3. **Test Data**: Keep test data in fixtures, not hardcoded
4. **Screenshots**: Take screenshots on failures for debugging
5. **Cleanup**: Each test should be independent and clean up after itself
6. **Selectors**: Use data-testid attributes for stable selectors
7. **Waits**: Use explicit waits with meaningful timeouts
8. **Mobile**: Always test mobile viewports
9. **Accessibility**: Include keyboard navigation and ARIA tests

## Performance Targets

- **Login**: < 5s
- **Message Send**: < 10s
- **AI Response**: < 15s
- **Page Load**: < 5s

Tests will fail if these targets aren't met.

## Debugging

### Run in Debug Mode

```bash
# Step through tests
pnpm dlx playwright test --debug

# Use Playwright Inspector
PWDEBUG=1 pnpm run test:e2e

# Generate trace
pnpm dlx playwright test --trace on
```

### View Test Report

```bash
pnpm dlx playwright show-report
```

### Take Screenshot During Test

```typescript
await takeScreenshot(page, 'debug-screenshot')
```

## Contributing

When adding new tests:

1. Update fixtures if adding new test data
2. Create helper functions for reusable actions
3. Test on all viewports (desktop + mobile)
4. Add accessibility checks
5. Include error scenarios
6. Document expected behavior
7. Keep tests independent
8. Update this README

## Success Criteria

All E2E tests must pass before merging to main:
- ✅ Login flow working
- ✅ Messaging functional
- ✅ Follow-up suggestions displayed
- ✅ Entity tracking working
- ✅ Error handling graceful
- ✅ Mobile responsive
- ✅ Keyboard accessible
- ✅ Performance targets met

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

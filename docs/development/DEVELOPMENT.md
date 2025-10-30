# MUVA Development Guide

> **⚠️ OUTDATED DOCUMENTATION WARNING**
>
> This document contains **obsolete references to Vercel deployment**. MUVA migrated to **VPS Hostinger** on October 4, 2025.
>
> **For current deployment information, see:**
> - `docs/deployment/VPS_SETUP_GUIDE.md` - VPS deployment guide
> - `docs/deployment/VPS_CRON_SETUP.md` - Cron jobs setup
> - `CLAUDE.md` - Current infrastructure overview
>
> **Production URLs (current):**
> - Web UI: https://muva.chat
> - API Health: https://muva.chat/api/health
> - API Status: https://muva.chat/api/status
>
> This document is kept for **historical reference only**. Do not follow Vercel-specific instructions.

---

## Table of Contents
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [API Development](#api-development)
- [Component Development](#component-development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key
- Anthropic API key

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd MUVA
   pnpm install
   ```

2. **Environment configuration:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Validate environment:**
   ```bash
   npm run validate-env
   ```

4. **Start development server:**
   ```bash
   pnpm run dev
   ```

5. **Access the application:**

   **Development (local):**
   - Web UI: http://localhost:3000
   - API Health: http://localhost:3000/api/health
   - API Status: http://localhost:3000/api/status

   **Production (Vercel):**
   - Web UI: https://muva.chat
   - API Health: https://muva.chat/api/health
   - API Status: https://muva.chat/api/status

## Project Structure

```
MUVA/
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── api/               # API routes (Edge Runtime)
│   │   │   ├── chat/          # Chat assistant endpoint
│   │   │   ├── validate/      # File validation endpoint
│   │   │   ├── health/        # Basic health check
│   │   │   └── status/        # Advanced system status
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── ChatAssistant/    # Chat interface
│   │   └── FileUploader/     # File upload/validation
│   ├── lib/                  # Utility libraries
│   │   ├── claude.ts         # Anthropic Claude integration
│   │   ├── openai.ts         # OpenAI embeddings
│   │   ├── supabase.ts       # Supabase client & search
│   │   ├── chunking.ts       # Document chunking
│   │   └── utils.ts          # Utility functions
│   └── __tests__/            # Test files
├── docs/                     # Documentation
├── scripts/                  # Utility scripts
├── public/                   # Static assets
└── config files
```

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `hotfix/*`: Production fixes

### Code Style
- ESLint configuration provided
- Prettier for formatting
- TypeScript strict mode
- Follow React/Next.js best practices

### Environment Variables

#### Required
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-proj-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
CLAUDE_MODEL=claude-3-haiku-20240307
CLAUDE_MAX_TOKENS=800
```

#### Optional
```env
NODE_ENV=development
VERCEL_URL=your-deployment-url
VERCEL_ENV=development
```

## API Development

### Edge Runtime
All API routes use Vercel Edge Runtime for better performance:

```typescript
export const runtime = 'edge'
```

### Error Handling
Consistent error handling pattern:

```typescript
try {
  // API logic
  return NextResponse.json(data)
} catch (error) {
  return NextResponse.json(
    {
      error: 'Error message',
      details: error.message,
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  )
}
```

### Authentication
Currently no authentication required. For future implementation:
- Consider NextAuth.js
- API key validation
- Rate limiting

### Rate Limiting
Implement rate limiting for production:
- Use Vercel Edge Config
- Redis-based limiting
- Per-IP restrictions

## Component Development

### UI Components
Built with shadcn/ui and Tailwind CSS:

```bash
# Add new UI component
npx shadcn-ui@latest add button
```

### Component Structure
```typescript
interface ComponentProps {
  // Define props with TypeScript
}

export function Component({ prop }: ComponentProps) {
  // Component logic
  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  )
}
```

### State Management
- React hooks for local state
- Context API for global state
- No external state library currently

## Testing

### Setup
```bash
# Run all tests
pnpm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode
npm run test:ci
```

### Test Structure
```
src/__tests__/
├── api/                    # API endpoint tests
│   ├── chat.test.ts
│   ├── validate.test.ts
│   └── health.test.ts
└── components/             # Component tests
    ├── ChatAssistant.test.tsx
    └── FileUploader.test.tsx
```

### Writing Tests

#### API Tests
```typescript
import { POST } from '@/app/api/chat/route'
import { NextRequest } from 'next/server'

describe('/api/chat', () => {
  it('should handle valid request', async () => {
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ question: 'test' })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

#### Component Tests
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Component } from '@/components/Component'

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })
})
```

## Deployment

### Pre-deployment Checklist
```bash
# Validate environment
npm run validate-env

# Run linting
pnpm run lint

# Build application
pnpm run build

# Run tests
npm run test:ci
```

### Deployment Commands
```bash
# Full deployment pipeline
npm run deploy

# Manual deployment
npm run pre-deploy
vercel --prod
```

### Environment Setup

#### Vercel Environment Variables
Set in Vercel dashboard or CLI:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add OPENAI_API_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add CLAUDE_MODEL
vercel env add CLAUDE_MAX_TOKENS
```

#### Health Checks
- Basic: `/api/health`
- Detailed: `/api/status`
- Monitor: Check HTTP status codes

### Performance Monitoring
- Vercel Analytics
- Custom metrics in `/api/status`
- Response time tracking

## Troubleshooting

### Common Issues

#### Environment Variables Not Loading
```bash
# Check environment validation
npm run validate-env

# Verify .env.local exists and has correct format
cat .env.local
```

#### API Errors

**Recommended - Use API calls:**
```javascript
// Check API health
const health = await fetch('https://muva.chat/api/health')
  .then(res => res.json());
console.log('System status:', health.status);

// Check detailed service status (local only)
const status = await fetch('http://localhost:3000/api/status')
  .then(res => res.json());
console.log('Services:', status.services);
```

**For debugging only (cURL):**
```bash
curl https://muva.chat/api/health
curl http://localhost:3000/api/status  # Local only
```

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
pnpm install

# Check TypeScript errors
npx tsc --noEmit
```

#### Performance Issues

**Recommended - Use API calls with timing:**
```javascript
// Monitor response times
const start = performance.now();
const response = await fetch('https://muva.chat/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: "Test performance" })
});
const data = await response.json();
const duration = performance.now() - start;
console.log(`API response time: ${duration.toFixed(2)}ms`);
```

**For debugging only (cURL):**
```bash
# Check response times
npm run validate-env:test

# Monitor API calls with timing
curl -w "@curl-format.txt" https://muva.chat/api/chat
```

#### Database Issues
```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
client.from('document_embeddings').select('id').limit(1).then(console.log);
"
```

### Debug Mode
Enable verbose logging in development:

```env
DEBUG=true
LOG_LEVEL=debug
```

### Getting Help
1. Check this documentation
2. Review API documentation in `/docs/openapi.yaml`
3. Check existing issues in repository
4. Create new issue with:
   - Environment details
   - Error messages
   - Steps to reproduce

## Contributing

### Pull Request Process
1. Create feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Create pull request with description

### Code Review Checklist
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Environment variables validated
- [ ] Performance impact considered
- [ ] Security implications reviewed

### Release Process
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release tag
4. Deploy to production
5. Monitor health checks

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com/)
- [Vercel Platform](https://vercel.com/docs)
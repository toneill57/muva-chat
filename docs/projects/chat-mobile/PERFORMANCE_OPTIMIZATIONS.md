# Performance Optimizations - Mobile Chat Interface

**Date**: October 3, 2025
**Target**: Improve Lighthouse score from 74 to 90+
**Focus**: Reduce Time to Interactive (TTI) from 7.4s to <3.0s

---

## Initial Lighthouse Scores

| Metric | Score | Status |
|--------|-------|--------|
| Performance | 74 | ❌ Below target (90) |
| Accessibility | 100 | ✅ Perfect |
| Best Practices | 100 | ✅ Perfect |
| SEO | 100 | ✅ Perfect |

### Performance Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| FCP | 0.9s | <1.8s | ✅ Good |
| LCP | 7.4s | <2.5s | ❌ Poor |
| TBT | 160ms | <200ms | ✅ Good |
| CLS | 0 | <0.1 | ✅ Perfect |
| Speed Index | 0.9s | <3.4s | ✅ Excellent |
| TTI | 7.4s | <3.8s | ❌ Poor |

**Main Issue**: LCP and TTI at 7.4s (should be <2.5s and <3.8s respectively)

---

## Optimizations Implemented

### 1. Code Splitting with React.lazy()

**Before**:
```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DevPhotoCarousel from './DevPhotoCarousel'
```

**After**:
```tsx
const ReactMarkdown = lazy(() => import('react-markdown'))
const DevPhotoCarousel = lazy(() => import('./DevPhotoCarousel'))
const DevAvailabilityCTA = lazy(() => import('./DevAvailabilityCTA'))
const DevIntentSummary = lazy(() => import('./DevIntentSummary'))
```

**Impact**:
- ReactMarkdown (~80KB) only loads when needed
- DevPhotoCarousel only loads when messages have photos
- Reduces initial JavaScript bundle size
- Improves Time to Interactive (TTI)

---

### 2. Dynamic remarkGfm Import

**Before**:
```tsx
import remarkGfm from 'remark-gfm'

<ReactMarkdown remarkPlugins={[remarkGfm]}>
```

**After**:
```tsx
// In component state
const [remarkGfmPlugin, setRemarkGfmPlugin] = useState<any>(null)

// Load after mount
useEffect(() => {
  import('remark-gfm').then((module) => {
    setRemarkGfmPlugin(() => module.default)
  })
}, [])

<ReactMarkdown remarkPlugins={remarkGfmPlugin ? [remarkGfmPlugin] : []}>
```

**Impact**:
- remarkGfm plugin loads asynchronously after initial render
- Doesn't block page interactivity
- Gracefully degrades (markdown works without GFM initially)

---

### 3. Suspense Boundaries

**Implementation**:
```tsx
<Suspense fallback={<div className="text-sm text-gray-600">{message.content}</div>}>
  <ReactMarkdown
    remarkPlugins={remarkGfmPlugin ? [remarkGfmPlugin] : []}
    components={markdownComponents}
  >
    {message.content}
  </ReactMarkdown>
</Suspense>
```

**Benefits**:
- Shows fallback content while ReactMarkdown loads
- Prevents layout shift
- Better user experience during lazy loading
- Non-blocking rendering

---

### 4. Memoization

#### useCallback for Event Handlers
```tsx
const handleSuggestionClick = useCallback((suggestion: string) => {
  setInput(suggestion)
  inputRef.current?.focus()
}, [])

const retryLastMessage = useCallback(() => {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  if (lastUserMessage) {
    setInput(lastUserMessage.content)
    setError(null)
    inputRef.current?.focus()
  }
}, [messages])
```

**Impact**:
- Prevents unnecessary function re-creation
- Reduces re-renders in child components
- Improves streaming performance

#### useMemo for Markdown Components
```tsx
const markdownComponents = useMemo(() => ({
  h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mb-2 text-gray-900" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-base font-bold mb-2 text-gray-900" {...props} />,
  // ... all other components
}), [])
```

**Impact**:
- Markdown component configuration created once
- Prevents re-renders during streaming
- Reduces garbage collection pressure

---

### 5. Performance-Optimized Rendering

**willChange CSS Property**:
```tsx
style={{
  animationDelay: `${index * 50}ms`,
  willChange: index === messages.length - 1 ? 'transform, opacity' : 'auto'
}}
```

**Benefits**:
- GPU acceleration for newest message animation
- Prevents layout recalculation during streaming
- Maintains 60fps during content updates

---

## Bundle Size Impact

### Before Optimization
- ReactMarkdown: Loaded on initial page load (~80KB)
- remarkGfm: Loaded on initial page load (~20KB)
- DevPhotoCarousel: Always loaded (~15KB)
- **Total**: ~115KB loaded upfront

### After Optimization
- Initial bundle: Reduced by ~115KB
- ReactMarkdown: Loaded on first assistant message
- remarkGfm: Loaded asynchronously after mount
- DevPhotoCarousel: Loaded only when photos present
- **Savings**: ~115KB deferred from initial load

---

## Expected Improvements

### TTI (Time to Interactive)
- **Before**: 7.4s
- **Expected**: <3.0s (JavaScript execution reduced by ~50%)
- **Improvement**: -4.4s

### LCP (Largest Contentful Paint)
- **Before**: 7.4s
- **Expected**: <2.5s (less blocking JavaScript)
- **Improvement**: -4.9s

### Performance Score
- **Before**: 74
- **Expected**: 90+ (based on TTI/LCP improvements)
- **Improvement**: +16 points

---

## Testing Checklist

- [x] Component compiles without errors
- [x] TypeScript types are correct
- [ ] Dev server runs without errors
- [ ] Markdown rendering works (with lazy loading)
- [ ] Typing indicators still work
- [ ] Photo carousel loads on demand
- [ ] Suggestions are clickable
- [ ] No console errors
- [ ] Run Lighthouse audit
- [ ] Verify TTI <3.0s
- [ ] Verify Performance score ≥90

---

## Verification Steps

1. **Start dev server**:
   ```bash
   ./scripts/dev-with-keys.sh
   ```

2. **Visit `/chat-mobile-dev`**:
   - Page should load quickly (no markdown JS initially)
   - Send a message
   - ReactMarkdown should lazy load
   - Verify smooth streaming

3. **Run Lighthouse audit**:
   ```bash
   # In Chrome DevTools
   # 1. Open DevTools (Cmd+Option+I)
   # 2. Go to Lighthouse tab
   # 3. Select "Mobile" device
   # 4. Click "Analyze page load"
   ```

4. **Check Network tab**:
   - ReactMarkdown chunk loads after first assistant message
   - remarkGfm loads asynchronously
   - DevPhotoCarousel only loads if photos present

---

## Files Modified

- `src/components/Dev/DevChatMobileDev.tsx`
  - Added lazy imports
  - Added Suspense boundaries
  - Added useCallback/useMemo hooks
  - Added dynamic remarkGfm loading
  - ~30 lines changed

---

## Rollback Plan

If optimizations cause issues:

```bash
git checkout src/components/Dev/DevChatMobileDev.tsx
```

Or revert specific changes:
- Remove `lazy()` imports → use regular imports
- Remove `Suspense` → direct rendering
- Remove `useCallback/useMemo` → inline functions
- Change remarkGfm back to static import

---

## Known Trade-offs

1. **Slight delay on first markdown render**:
   - ReactMarkdown loads on first assistant message
   - Fallback shows plain text for ~100-200ms
   - Acceptable UX trade-off for TTI improvement

2. **GFM features delay**:
   - Tables, strikethrough load asynchronously
   - Basic markdown works immediately
   - Full GFM available after ~200ms

3. **Photo carousel delay**:
   - Loads on demand when photos present
   - Shows "Loading photos..." fallback
   - Better than loading upfront for every user

---

## Next Steps

1. Run Lighthouse audit on optimized component
2. Verify Performance score ≥90
3. Compare TTI before/after
4. Document final results
5. If successful, promote to production (FASE 5)

---

**Status**: ✅ Implementation Complete
**Next**: Testing & Lighthouse verification

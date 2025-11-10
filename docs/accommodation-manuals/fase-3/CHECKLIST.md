# FASE 3: Production Deployment Checklist

**Phase:** UI Testing & Visual Validation
**Status:** 90% Complete
**Date:** 2025-11-09

---

## Pre-Deployment Tasks

### High Priority Fixes (REQUIRED - 15 min)

- [ ] **Fix Touch Target Sizes** (5 min)
  - File: `src/components/Accommodation/AccommodationManualsSection.tsx`
  - Lines: 318-332
  - Change:
    ```tsx
    // Add p-2 and rounded classes
    className="p-2 rounded text-blue-600 hover:text-blue-700 transition-colors"
    ```
  - Apply to: View button (Eye icon) and Delete button (Trash2 icon)

- [ ] **Add ARIA Labels** (10 min)
  - File: `src/components/Accommodation/AccommodationManualsSection.tsx`
  - Add to buttons:
    ```tsx
    // View button
    aria-label="View manual content"

    // Delete button
    aria-label={`Delete ${manual.filename}`}

    // Plus button
    aria-label="Upload another manual"
    ```
  - File: `src/components/Accommodation/ManualContentModal.tsx`
  - Add to modal close button:
    ```tsx
    aria-label="Close modal"
    ```

---

### Manual Testing (30 min)

- [ ] **Test on Real Devices**
  - [ ] iPhone (Safari iOS 17+)
  - [ ] Android (Chrome Mobile)
  - [ ] iPad (Safari iPadOS 17+)

- [ ] **Verify Touch Targets**
  - [ ] Can easily tap View icon
  - [ ] Can easily tap Delete icon
  - [ ] Can easily tap Plus icon
  - [ ] Can easily tap Modal close button

- [ ] **Test Core Flows**
  - [ ] Upload manual via drag & drop
  - [ ] Upload manual via file picker
  - [ ] View manual content in modal
  - [ ] Expand/collapse accordion
  - [ ] Delete manual with confirmation
  - [ ] Test on empty state

- [ ] **Test Error States**
  - [ ] Try uploading .txt file (should show error)
  - [ ] Try uploading 11MB file (should show error)
  - [ ] Test with network disconnected (should show error)

---

### Screenshot Capture (20 min)

Follow: `screenshots/README.md`

- [ ] 01-empty-state.png
- [ ] 02-uploading.png
- [ ] 03-list-state.png
- [ ] 04-modal-closed.png
- [ ] 05-modal-open.png
- [ ] 06-after-delete.png
- [ ] 07-mobile.png
- [ ] 08-desktop.png

Store in: `/docs/accommodation-manuals/fase-3/screenshots/`

---

### Code Review (15 min)

- [ ] **Component Files**
  - [ ] AccommodationManualsSection.tsx - No console errors
  - [ ] ManualContentModal.tsx - No console errors
  - [ ] TypeScript types complete

- [ ] **Build Verification**
  - [ ] Run: `pnpm run build`
  - [ ] No TypeScript errors
  - [ ] No ESLint warnings
  - [ ] Bundle size acceptable

---

## Post-Deployment Tasks

### Medium Priority Fixes (OPTIONAL - 17 min)

- [ ] **Add Custom Focus Indicators** (15 min)
  - Add to all interactive elements:
    ```tsx
    className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus-visible:rounded"
    ```

- [ ] **Add Filename Tooltips** (2 min)
  - File: `src/components/Accommodation/AccommodationManualsSection.tsx`
  - Line: 307
  - Add:
    ```tsx
    <p
      className="text-sm font-medium text-gray-900 truncate"
      title={manual.filename}
    >
      {manual.filename}
    </p>
    ```

---

### Monitoring (Ongoing)

- [ ] **Set up Error Tracking**
  - [ ] Monitor upload success rate
  - [ ] Track 404 errors
  - [ ] Track API errors
  - [ ] Monitor modal open/close events

- [ ] **Analytics**
  - [ ] Track manual upload frequency
  - [ ] Track modal view frequency
  - [ ] Track delete frequency
  - [ ] Measure engagement

- [ ] **User Feedback**
  - [ ] Collect feedback from first 10 users
  - [ ] Monitor support tickets
  - [ ] Track feature requests

---

### Documentation Updates (30 min)

- [ ] **Add Screenshots to Documentation**
  - Update `UI_TESTS.md` with actual screenshots
  - Add captions and annotations

- [ ] **Update README**
  - Add deployment date
  - Add known issues (if any)
  - Add user guide link

- [ ] **Create User Guide** (if needed)
  - How to upload manuals
  - How to view content
  - How to delete manuals
  - Troubleshooting section

---

## Deployment Verification

### Staging Environment

- [ ] **Deploy to Staging**
  - URL: `http://simmerdown.localhost:3001/accommodations/units`
  - [ ] Manual section renders
  - [ ] Upload works
  - [ ] Modal works
  - [ ] Delete works

- [ ] **Run Full Test Suite**
  - [ ] All 22 tests pass
  - [ ] No console errors
  - [ ] No network errors

---

### Production Environment

- [ ] **Deploy to Production**
  - [ ] Build succeeds
  - [ ] No deployment errors
  - [ ] Health check passes

- [ ] **Smoke Test**
  - [ ] Navigate to units page
  - [ ] Manual section renders
  - [ ] Upload a test manual
  - [ ] View manual in modal
  - [ ] Delete test manual

- [ ] **Monitor First Hour**
  - [ ] No error spikes
  - [ ] No performance degradation
  - [ ] No user reports of issues

---

## Rollback Plan

### If Issues Occur

- [ ] **Immediate Actions**
  - [ ] Check error logs
  - [ ] Identify affected users
  - [ ] Assess severity

- [ ] **Minor Issues**
  - [ ] Create hotfix branch
  - [ ] Apply fix
  - [ ] Deploy hotfix

- [ ] **Major Issues**
  - [ ] Rollback to previous version
  - [ ] Notify users
  - [ ] Create incident report

---

## Sign-Off

### Pre-Deployment

- [ ] **High-priority fixes applied** (15 min)
- [ ] **Manual testing complete** (30 min)
- [ ] **Screenshots captured** (20 min)
- [ ] **Code review passed** (15 min)

**Total Time:** ~1.5 hours

---

### Deployment

- [ ] **Staging tested** ✅
- [ ] **Production deployed** ✅
- [ ] **Smoke test passed** ✅
- [ ] **Monitoring active** ✅

---

### Post-Deployment

- [ ] **Medium-priority fixes applied** (optional)
- [ ] **Documentation updated**
- [ ] **User feedback collected**
- [ ] **Performance metrics baseline established**

---

## Success Criteria

### Technical
- ✅ All high-priority fixes applied
- ✅ No console errors
- ✅ Build succeeds
- ✅ All tests pass

### User Experience
- ✅ Touch targets work on mobile
- ✅ Upload flow is smooth
- ✅ Modal is responsive
- ✅ Error messages are clear

### Performance
- ✅ Page load < 2s
- ✅ Upload completes < 5s
- ✅ Modal opens < 500ms
- ✅ No layout shifts

### Accessibility
- ✅ Keyboard navigation works
- ✅ Screen reader compatible
- ✅ Color contrast meets WCAG AA
- ✅ Focus indicators visible

---

## Contacts

**Phase Owner:** Claude Code (UX-Interface Agent)
**Product Manager:** [Name]
**Tech Lead:** [Name]
**QA Lead:** [Name]

---

## Related Documents

- `DELIVERABLES.md` - Complete deliverables report
- `UI_TESTS.md` - Detailed test cases
- `TESTING_SUMMARY.md` - Executive summary
- `screenshots/README.md` - Screenshot guide

---

**Last Updated:** 2025-11-09
**Next Review:** After production deployment

# 🚨 Claude Code Session Reminders

## Critical Workflows to Prevent Glitches

### 🔴 ALWAYS Read Before Edit (Complex Changes)

**When to Read first:**
- ✅ Lists with 3+ items
- ✅ Nested structures (sub-bullets, objects)
- ✅ Any edit where you're not 100% certain of exact current content
- ✅ Files modified recently (< 5 minutes ago)
- ✅ After user mentions "weird behavior" or "glitch"

**Why?**
- Edit requires byte-perfect match
- Memory/paraphrasing causes "String Not Found" errors
- User sees this as a glitch

**Trade-off:**
- Read first: +500 tokens but 100% success
- Edit blind: 280 tokens average, 70% success, 30% retry (looks bad)

---

### ✅ Safe Edit Workflow

```
1. Read file JUSTO ANTES de Edit
2. Copy EXACT text from Read output (including whitespace)
3. Edit with exact old_string
4. Verify success message
```

---

### ⚠️ Auto-Save Settings

**.vscode/settings.json:**
- `files.autoSaveDelay`: 1000ms (1 second)
- `files.refactoring.autoSave`: false

**This means:**
- Files save 1 second after last change
- If you Edit during this window, race condition possible
- Wait for save to complete before complex edits

---

## Session Context Notes

**Updated:** October 9, 2025
**MCP Status:** 5/5 connected (claude-context, knowledge-graph, memory-keeper, context7, supabase)
**Known Issues:** None - glitches resolved with Read-first workflow

# 🪝 Claude Code Hooks

**Project:** InnPilot
**Purpose:** Automatic error detection and Infrastructure Monitor activation
**Status:** 🔴 **NOT ENABLED** (as of Oct 6, 2025)

---

## 📋 What Are Hooks?

**Hooks** are shell scripts that Claude Code executes automatically after specific events:

- **post-tool-use**: Runs after each tool call (Bash, Read, Edit, etc.)
- **user-prompt-submit**: Runs when user submits a message

InnPilot uses hooks to:
1. ✅ Detect errors automatically after each tool call
2. ✅ Log errors to `errors.jsonl` for analysis
3. ✅ Trigger Infrastructure Monitor agent proactively
4. ✅ Generate diagnostic reports without manual intervention

---

## 📂 Available Hooks

### 1. post-tool-use-error-detector.sh

**File:** `.claude/hooks/post-tool-use-error-detector.sh`
**Trigger:** After each tool call
**Purpose:** Detect errors and append to `errors.jsonl`

**Behavior:**
```bash
# Inputs (provided by Claude Code)
TOOL_NAME="$1"        # e.g., "Bash", "Read", "Edit"
TOOL_OUTPUT="$2"      # stdout + stderr
EXIT_CODE="$3"        # 0 = success, non-zero = error

# Logic
if [ "$EXIT_CODE" -ne 0 ]; then
  # Extract error message
  ERROR_MSG=$(echo "$TOOL_OUTPUT" | grep -i "error")

  # Append to errors.jsonl
  echo "{
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"tool\": \"$TOOL_NAME\",
    \"exit_code\": $EXIT_CODE,
    \"error\": \"$ERROR_MSG\"
  }" >> .claude/errors.jsonl
fi
```

**Output Example:**
```json
{
  "timestamp": "2025-10-06T19:25:00Z",
  "tool": "mcp__supabase__execute_sql",
  "exit_code": 1,
  "error": "ERROR: 42501: permission denied for schema public"
}
```

---

## 🚀 How to Use

### Prerequisites

1. **Claude Code** installed and configured
2. **Hooks enabled** in Claude Code settings (see `docs/development/CLAUDE_HOOKS_SETUP.md`)
3. **Hook scripts executable** (`chmod +x .claude/hooks/*.sh`)

### Workflow

```
┌─────────────────────┐
│ Claude executes     │
│ tool (e.g., Bash)   │
└──────────┬──────────┘
           │
           ↓ (error occurs)
┌─────────────────────────────────────────┐
│ post-tool-use-error-detector.sh runs    │
│ - Detects exit code != 0                │
│ - Extracts error message                │
│ - Appends to .claude/errors.jsonl       │
└──────────┬──────────────────────────────┘
           │
           ↓ (multiple errors accumulate)
┌─────────────────────────────────────────┐
│ Infrastructure Monitor agent activated  │
│ - Reads .claude/errors.jsonl            │
│ - Groups errors by type/tool            │
│ - Generates diagnostic report           │
│ - Presents to user at session end       │
└─────────────────────────────────────────┘
```

### Example Session

```bash
# Start Claude Code session
claude-code

# User: "Run this command: ls /nonexistent"
# Claude executes: Bash("ls /nonexistent")
# → Error: "ls: /nonexistent: No such file or directory"
# → Hook runs → Appends to errors.jsonl

# User: "Apply this migration: ALTER VIEW ..."
# Claude executes: mcp__supabase__execute_sql(...)
# → Error: "permission denied for schema public"
# → Hook runs → Appends to errors.jsonl

# ... more errors ...

# At end of session:
# Infrastructure Monitor detects errors.jsonl
# Presents report:
# "🚨 Detected 4 errors during this session:
#  1. Bash: No such file (1 occurrence)
#  2. SQL: Permission denied (3 occurrences)
#
#  Would you like me to generate a detailed ERROR_ANALYSIS.md?"
```

---

## 🔧 Configuration

### Enable Hooks in Claude Code

**⚠️ CRITICAL:** Hooks are **NOT enabled by default**.

See complete guide: `docs/development/CLAUDE_HOOKS_SETUP.md`

**Quick Setup:**
1. Open Claude Code settings
2. Enable "Post-Tool-Use Hook"
3. Restart Claude Code
4. Test with intentional error: `ls /fake_dir`
5. Verify `.claude/errors.jsonl` created

---

## 📊 Monitoring

### Check Hook Execution

```bash
# Verify errors.jsonl exists and is populated
ls -lh .claude/errors.jsonl

# View latest errors
tail -5 .claude/errors.jsonl | python3 -m json.tool

# Count errors by tool
jq -r '.tool' .claude/errors.jsonl | sort | uniq -c
```

### Clear Errors Log

```bash
# Option 1: Delete (start fresh)
rm .claude/errors.jsonl

# Option 2: Archive (preserve history)
mv .claude/errors.jsonl .claude/errors-$(date +%Y%m%d-%H%M%S).jsonl

# Option 3: Archive and compress (save space)
gzip -c .claude/errors.jsonl > .claude/errors-$(date +%Y%m%d).jsonl.gz
rm .claude/errors.jsonl
```

---

## 🎯 Best Practices

### 1. Clear errors.jsonl Between Sessions
```bash
# Add to project startup script
if [ -f .claude/errors.jsonl ]; then
  mv .claude/errors.jsonl .claude/errors-backup.jsonl
fi
```

### 2. Exclude Transient Files from Git
```bash
# .gitignore
.claude/errors*.jsonl
.claude/hook_debug.log
.claude/hook_metrics.log
```

### 3. Test Hooks After Modifications
```bash
# Run hook manually with test data
bash -x .claude/hooks/post-tool-use-error-detector.sh \
  "TestTool" \
  "ERROR: Test error message" \
  1

# Verify output
tail -1 .claude/errors.jsonl
```

### 4. Monitor Hook Performance
```bash
# Add timing to hook script (at end of post-tool-use-error-detector.sh)
echo "Hook completed: $(date +%s%N)" >> .claude/hook_metrics.log

# Analyze average execution time
awk '{print ($NF - prev); prev=$NF}' .claude/hook_metrics.log | \
  awk '{sum+=$1; n++} END {print sum/n/1000000 " ms average"}'
```

---

## 🚨 Troubleshooting

### Issue: errors.jsonl Not Created

**Possible Causes:**
1. ❌ Hooks not enabled in Claude Code settings
2. ❌ Hook script not executable (`chmod +x`)
3. ❌ Hook script has syntax errors
4. ❌ Claude Code version too old (requires v1.5+)

**Solution:**
```bash
# Check 1: Verify executable
ls -la .claude/hooks/post-tool-use-error-detector.sh
# Should show: -rwxr-xr-x (x = executable)

# Check 2: Test syntax
bash -n .claude/hooks/post-tool-use-error-detector.sh
# No output = valid syntax

# Check 3: Run manually
bash -x .claude/hooks/post-tool-use-error-detector.sh "Test" "Error" 1
# Should append to errors.jsonl

# Check 4: Enable hooks in settings
# See docs/development/CLAUDE_HOOKS_SETUP.md
```

### Issue: Infrastructure Monitor Not Activating

**Possible Causes:**
1. ❌ errors.jsonl has invalid JSON
2. ❌ Not enough errors (may require 3+ errors)
3. ❌ Infrastructure Monitor agent not configured

**Solution:**
```bash
# Check 1: Validate JSON
python3 -m json.tool .claude/errors.jsonl
# Should not show syntax errors

# Check 2: Count errors
wc -l .claude/errors.jsonl
# Should have 3+ lines

# Check 3: Verify agent config
cat .claude/agents/infrastructure-monitor.md | grep "errors.jsonl"
# Should mention proactive activation
```

---

## 📚 Related Documentation

- **Setup Guide:** `docs/development/CLAUDE_HOOKS_SETUP.md` - Complete setup instructions
- **Error Analysis Example:** `docs/security/health-checks/ERROR_ANALYSIS_20251006.md` - Real error analysis from Oct 6 health check
- **Infrastructure Monitor:** `.claude/agents/infrastructure-monitor.md` - Agent that processes errors.jsonl
- **Project Instructions:** `CLAUDE.md` - Overview of hooks in InnPilot workflow

---

## 📞 Support

**Hooks not working?**

1. Read setup guide: `docs/development/CLAUDE_HOOKS_SETUP.md`
2. Check Claude Code version: `claude-code --version` (requires v1.5+)
3. Review error logs: `cat .claude/hook_debug.log`
4. Test manually: `bash -x .claude/hooks/post-tool-use-error-detector.sh "Test" "Error" 1`

**Still stuck?**
- Claude Code Issues: https://github.com/anthropics/claude-code/issues
- InnPilot Issues: Internal project documentation

---

**Created:** October 6, 2025
**Reason:** Discovered hooks not active during health check session
**Next Action:** User must enable hooks in Claude Code settings
**Verification:** Run `ls /fake_dir` and check if `errors.jsonl` created

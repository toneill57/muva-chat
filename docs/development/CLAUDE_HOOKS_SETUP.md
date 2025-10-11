# 🪝 Claude Code Hooks - Setup Guide

**Last Updated:** October 6, 2025
**Status:** 🔴 **HOOKS NOT ENABLED** (discovered during Oct 6 health check)

---

## 📋 What Are Claude Code Hooks?

Claude Code supports **hooks** - shell scripts that run automatically after specific events (like tool calls). MUVA uses hooks to:

1. **Detect errors automatically** after each tool use
2. **Capture error context** (tool name, command, error message)
3. **Trigger Infrastructure Monitor proactively** when errors accumulate
4. **Generate diagnostic reports** without manual intervention

---

## 🚨 Current Issue

**Problem:** Hooks exist in `.claude/hooks/` but are **NOT active**.

**Evidence:**
```bash
# Hook script exists
ls -la .claude/hooks/post-tool-use-error-detector.sh
# -rwxr-xr-x  post-tool-use-error-detector.sh ✅

# But errors.jsonl doesn't exist (should be auto-created by hook)
ls -la .claude/errors.jsonl
# ls: .claude/errors.jsonl: No such file or directory ❌
```

**Expected Behavior:**
- After each tool call with error → Hook runs → Writes to `errors.jsonl`
- At end of session → Infrastructure Monitor reads `errors.jsonl` → Presents diagnostic report

**Actual Behavior:**
- Hooks don't execute → No `errors.jsonl` file → Infrastructure Monitor never activates automatically

---

## ✅ How to Enable Hooks

### Step 1: Verify Hook Script Exists

```bash
# Check hook file exists and is executable
cd /Users/oneill/Sites/apps/MUVA
ls -la .claude/hooks/post-tool-use-error-detector.sh

# Expected output:
# -rwxr-xr-x  1 user  staff  XXX Oct  6 XX:XX post-tool-use-error-detector.sh
#  ^^^ - Should be executable (x permission)
```

If not executable:
```bash
chmod +x .claude/hooks/post-tool-use-error-detector.sh
```

### Step 2: Enable Hooks in Claude Code Settings

**⚠️ CRITICAL:** This is the missing step discovered on Oct 6, 2025.

**Option A: VS Code Settings (if using Claude Code extension)**
1. Open VS Code Settings (`Cmd+,` on Mac)
2. Search for "Claude Code Hooks"
3. Enable "Enable User-Prompt-Submit Hook"
4. Enable "Enable Post-Tool-Use Hook"
5. Restart VS Code

**Option B: CLI Configuration (if using claude-code CLI)**
```bash
# Check current hook configuration
claude-code config list | grep hooks

# Enable hooks
claude-code config set hooks.enabled true
claude-code config set hooks.post_tool_use true
```

**Option C: Configuration File (if using config.json)**
Edit `~/.config/claude-code/config.json`:
```json
{
  "hooks": {
    "enabled": true,
    "post_tool_use": true
  }
}
```

### Step 3: Verify Hooks Are Active

**Test 1: Intentional Error**
```bash
# Ask Claude Code to run an invalid command
# In Claude Code chat:
"Run bash command: ls /nonexistent_directory_12345"
```

**Expected Result:**
```bash
# After error, check if errors.jsonl was created
ls -la .claude/errors.jsonl

# Should exist now with JSON content
cat .claude/errors.jsonl
# {
#   "timestamp": "2025-10-06T...",
#   "tool": "Bash",
#   "error": "ls: /nonexistent_directory_12345: No such file or directory",
#   ...
# }
```

**Test 2: Infrastructure Monitor Activation**
```bash
# Trigger multiple errors (3-5 errors recommended)
# At end of session, Infrastructure Monitor should:
# 1. Detect errors.jsonl
# 2. Present diagnostic report automatically
# 3. Offer to generate ERROR_ANALYSIS document
```

---

## 🔍 Troubleshooting

### Issue: Hook Script Runs but errors.jsonl Not Created

**Check 1: Script has write permissions**
```bash
# Verify Claude Code can write to .claude/ directory
touch .claude/test_write.txt && rm .claude/test_write.txt

# If fails, fix permissions:
chmod 755 .claude/
```

**Check 2: Script syntax is valid**
```bash
# Run hook script manually
bash -x .claude/hooks/post-tool-use-error-detector.sh

# Should not have syntax errors
```

**Check 3: Hook receives error context**
```bash
# Add debug output to hook script
# Edit .claude/hooks/post-tool-use-error-detector.sh
# Add at top:
echo "Hook triggered at $(date)" >> .claude/hook_debug.log
echo "Args: $@" >> .claude/hook_debug.log
```

### Issue: Infrastructure Monitor Not Activating

**Check 1: errors.jsonl format is valid JSON**
```bash
# Validate JSON syntax
python3 -m json.tool .claude/errors.jsonl

# If invalid, hook script has bug
```

**Check 2: Infrastructure Monitor reads errors.jsonl**
```bash
# Check Infrastructure Monitor agent definition
cat .claude/agents/infrastructure-monitor.md | grep -A 5 "errors.jsonl"

# Should mention proactive activation trigger
```

**Check 3: Errors threshold**
```bash
# Infrastructure Monitor may require minimum errors (e.g., 3+)
# Check if errors.jsonl has enough entries
wc -l .claude/errors.jsonl
```

---

## 📚 Hook Script Reference

### post-tool-use-error-detector.sh

**Location:** `.claude/hooks/post-tool-use-error-detector.sh`
**Trigger:** After each tool call (Read, Bash, Edit, etc.)
**Purpose:** Detect errors and append to `errors.jsonl`

**Script Structure:**
```bash
#!/bin/bash

# Inputs (passed by Claude Code):
# $1 - Tool name (e.g., "Bash", "Read", "Edit")
# $2 - Tool output (stdout + stderr)
# $3 - Exit code (0 = success, non-zero = error)

TOOL_NAME="$1"
TOOL_OUTPUT="$2"
EXIT_CODE="$3"

# Only log errors (exit code != 0)
if [ "$EXIT_CODE" -ne 0 ]; then
  # Extract error message
  ERROR_MSG=$(echo "$TOOL_OUTPUT" | grep -i "error" || echo "$TOOL_OUTPUT")

  # Append to errors.jsonl
  echo "{
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"tool\": \"$TOOL_NAME\",
    \"exit_code\": $EXIT_CODE,
    \"error\": \"$ERROR_MSG\"
  }" >> .claude/errors.jsonl
fi
```

### Customizing Hook Behavior

**Example: Email notification on critical errors**
```bash
# Add to post-tool-use-error-detector.sh
if [[ "$ERROR_MSG" =~ "CRITICAL" ]]; then
  echo "Critical error detected" | mail -s "MUVA Error" admin@example.com
fi
```

**Example: Slack notification**
```bash
# Add to post-tool-use-error-detector.sh
if [ "$EXIT_CODE" -ne 0 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"Error in $TOOL_NAME: $ERROR_MSG\"}" \
    https://hooks.slack.com/services/YOUR/WEBHOOK/URL
fi
```

---

## 🎯 Best Practices

### 1. Keep errors.jsonl Clean
```bash
# Clear errors.jsonl at start of each session
rm -f .claude/errors.jsonl

# Or archive old errors
mv .claude/errors.jsonl .claude/errors-$(date +%Y%m%d).jsonl
```

### 2. Monitor Hook Performance
```bash
# Add timing to hook script
START_TIME=$(date +%s%N)
# ... hook logic ...
END_TIME=$(date +%s%N)
DURATION=$(( ($END_TIME - $START_TIME) / 1000000 )) # milliseconds

echo "Hook execution: ${DURATION}ms" >> .claude/hook_metrics.log
```

### 3. Test Hooks After Updates
```bash
# After modifying hook script, test immediately
bash -x .claude/hooks/post-tool-use-error-detector.sh "TestTool" "Error message" 1

# Verify errors.jsonl updated
tail -1 .claude/errors.jsonl
```

### 4. Version Control Hooks
```bash
# Ensure .gitignore excludes transient files
cat .gitignore | grep -q "errors.jsonl" || echo ".claude/errors*.jsonl" >> .gitignore
cat .gitignore | grep -q "hook_debug.log" || echo ".claude/hook_debug.log" >> .gitignore

# But keep hook scripts in git
git add .claude/hooks/*.sh
```

---

## 🔗 Integration with Infrastructure Monitor

### Workflow

```
[Tool Call Error]
    ↓
[post-tool-use-error-detector.sh runs]
    ↓
[Appends to .claude/errors.jsonl]
    ↓
[Infrastructure Monitor detects errors.jsonl at session end]
    ↓
[Presents diagnostic report]
    ↓
[Offers to create ERROR_ANALYSIS.md]
```

### Infrastructure Monitor Configuration

See `.claude/agents/infrastructure-monitor.md`:
```markdown
## 🚨 Proactive Error Detection

Se invoca AUTOMÁTICAMENTE cuando `.claude/errors.jsonl` existe (creado por hooks)

### Trigger Conditions:
1. File `.claude/errors.jsonl` exists ✅
2. Contains valid JSON entries ✅
3. At least 1 error logged ✅

### Automatic Actions:
1. Parse errors.jsonl
2. Group errors by type/tool
3. Generate diagnostic report
4. Present to user at session end
5. Offer to create detailed ERROR_ANALYSIS.md
```

---

## 📊 Verification Checklist

Use this checklist to verify hooks are working correctly:

- [ ] Hook script exists: `.claude/hooks/post-tool-use-error-detector.sh`
- [ ] Hook script is executable: `chmod +x post-tool-use-error-detector.sh`
- [ ] Hooks enabled in Claude Code settings
- [ ] Test error triggers hook: `ls /nonexistent_dir`
- [ ] `errors.jsonl` file created after error
- [ ] `errors.jsonl` contains valid JSON
- [ ] Infrastructure Monitor activates after 3+ errors
- [ ] Error analysis report generated automatically

---

## 🚀 Quick Start

**Full setup in 2 minutes:**

```bash
# 1. Navigate to project
cd /Users/oneill/Sites/apps/MUVA

# 2. Verify hook exists and is executable
ls -la .claude/hooks/post-tool-use-error-detector.sh
chmod +x .claude/hooks/post-tool-use-error-detector.sh

# 3. Enable hooks in Claude Code settings
# (see "Step 2: Enable Hooks in Claude Code Settings" above)

# 4. Test with intentional error
# In Claude Code: "Run bash command: ls /fake_directory_xyz"

# 5. Verify errors.jsonl created
cat .claude/errors.jsonl

# ✅ If file exists with JSON → Hooks working!
# ❌ If file doesn't exist → Hooks still not enabled (check settings)
```

---

## 📞 Support

**If hooks still don't work after following this guide:**

1. Check Claude Code version: `claude-code --version` (requires v1.5+ for hooks)
2. Check hook script logs: `cat .claude/hook_debug.log`
3. Review Infrastructure Monitor agent: `.claude/agents/infrastructure-monitor.md`
4. Contact Claude Code support: https://github.com/anthropics/claude-code/issues

---

## 📝 Related Documentation

- **Infrastructure Monitor Agent:** `.claude/agents/infrastructure-monitor.md`
- **Error Analysis Example:** `docs/security/health-checks/ERROR_ANALYSIS_20251006.md`
- **Hook Scripts:** `.claude/hooks/README.md`
- **Project Setup:** `CLAUDE.md`

---

**Created By:** Backend Developer
**Date:** October 6, 2025
**Reason:** Discovered hooks not active during health check session
**Status:** 🔴 **AWAITING USER ACTIVATION**

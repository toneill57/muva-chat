#!/bin/bash

# ===================================================================
# GitHub Secrets Configuration Script
# ===================================================================
# This script helps you configure all required GitHub Secrets
# for the three-environment CI/CD setup.
#
# Usage:
#   1. Install GitHub CLI: brew install gh
#   2. Login to GitHub: gh auth login
#   3. Run this script: ./scripts/setup-github-secrets.sh
# ===================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed!"
    echo ""
    echo "Install it with: brew install gh"
    echo "Then login with: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    print_error "Not authenticated with GitHub CLI!"
    echo ""
    echo "Please login with: gh auth login"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
print_info "Repository: $REPO"

# ===================================================================
# DEVELOPMENT ENVIRONMENT SECRETS
# ===================================================================

print_header "📦 DEVELOPMENT ENVIRONMENT SECRETS"

echo "Setting up Development (dev) environment secrets..."
echo ""

# DEV_SUPABASE_URL
gh secret set DEV_SUPABASE_URL \
    --body "https://ooaumjzaztmutltifhoq.supabase.co" \
    && print_success "DEV_SUPABASE_URL set"

# DEV_SUPABASE_ANON_KEY
gh secret set DEV_SUPABASE_ANON_KEY \
    --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQyMDksImV4cCI6MjA3MjQzMDIwOX0.HapBSfCjxBuUijFQvQIgu8Y44YI3OPL6Gr45RKTw-Fk" \
    && print_success "DEV_SUPABASE_ANON_KEY set"

# DEV_SUPABASE_SERVICE_ROLE_KEY
gh secret set DEV_SUPABASE_SERVICE_ROLE_KEY \
    --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc" \
    && print_success "DEV_SUPABASE_SERVICE_ROLE_KEY set"

# DEV_SUPABASE_PROJECT_ID
gh secret set DEV_SUPABASE_PROJECT_ID \
    --body "ooaumjzaztmutltifhoq" \
    && print_success "DEV_SUPABASE_PROJECT_ID set"

# ===================================================================
# STAGING ENVIRONMENT SECRETS
# ===================================================================

print_header "🚀 STAGING ENVIRONMENT SECRETS"

echo "Setting up Staging environment secrets..."
echo ""

# STAGING_SUPABASE_URL
gh secret set STAGING_SUPABASE_URL \
    --body "https://rvjmwwvkhglcuqwcznph.supabase.co" \
    && print_success "STAGING_SUPABASE_URL set"

# STAGING_SUPABASE_ANON_KEY
gh secret set STAGING_SUPABASE_ANON_KEY \
    --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNDAxNzcsImV4cCI6MjA3NzYxNjE3N30.HygM917avxMH3hb4gdEEK7xbt26bUx9jky1dbH_6CdA" \
    && print_success "STAGING_SUPABASE_ANON_KEY set"

# STAGING_SUPABASE_SERVICE_ROLE_KEY
gh secret set STAGING_SUPABASE_SERVICE_ROLE_KEY \
    --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MDE3NywiZXhwIjoyMDc3NjE2MTc3fQ.yOfeLkNPD-dM_IB954XtelUv-d237vfa39UdUB1WTlA" \
    && print_success "STAGING_SUPABASE_SERVICE_ROLE_KEY set"

# STAGING_SUPABASE_PROJECT_ID
gh secret set STAGING_SUPABASE_PROJECT_ID \
    --body "rvjmwwvkhglcuqwcznph" \
    && print_success "STAGING_SUPABASE_PROJECT_ID set"

# STAGING_SUPABASE_DB_PASSWORD
gh secret set STAGING_SUPABASE_DB_PASSWORD \
    --body "3hZMdp62TmM6RycK" \
    && print_success "STAGING_SUPABASE_DB_PASSWORD set"

# STAGING VPS CREDENTIALS
print_info "Setting up Staging VPS credentials..."

# STAGING_VPS_HOST
gh secret set STAGING_VPS_HOST \
    --body "195.200.6.216" \
    && print_success "STAGING_VPS_HOST set"

# STAGING_VPS_USER
gh secret set STAGING_VPS_USER \
    --body "root" \
    && print_success "STAGING_VPS_USER set"

# STAGING_VPS_PASSWORD (from context)
gh secret set STAGING_VPS_PASSWORD \
    --body "rabbitHole0+" \
    && print_success "STAGING_VPS_PASSWORD set"

# ===================================================================
# PRODUCTION ENVIRONMENT SECRETS
# ===================================================================

print_header "🏭 PRODUCTION ENVIRONMENT SECRETS"

echo "Setting up Production environment secrets..."
echo ""

# PROD_SUPABASE_URL
gh secret set PROD_SUPABASE_URL \
    --body "https://ooaumjzaztmutltifhoq.supabase.co" \
    && print_success "PROD_SUPABASE_URL set"

# PROD_SUPABASE_ANON_KEY
gh secret set PROD_SUPABASE_ANON_KEY \
    --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQyMDksImV4cCI6MjA3MjQzMDIwOX0.HapBSfCjxBuUijFQvQIgu8Y44YI3OPL6Gr45RKTw-Fk" \
    && print_success "PROD_SUPABASE_ANON_KEY set"

# PROD_SUPABASE_SERVICE_ROLE_KEY
gh secret set PROD_SUPABASE_SERVICE_ROLE_KEY \
    --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc" \
    && print_success "PROD_SUPABASE_SERVICE_ROLE_KEY set"

# PROD_SUPABASE_PROJECT_ID
gh secret set PROD_SUPABASE_PROJECT_ID \
    --body "ooaumjzaztmutltifhoq" \
    && print_success "PROD_SUPABASE_PROJECT_ID set"

# PROD VPS CREDENTIALS
print_info "Setting up Production VPS credentials..."
print_warning "Using same VPS as staging (different paths)"

# PROD_VPS_HOST
gh secret set PROD_VPS_HOST \
    --body "195.200.6.216" \
    && print_success "PROD_VPS_HOST set"

# PROD_VPS_USER
gh secret set PROD_VPS_USER \
    --body "root" \
    && print_success "PROD_VPS_USER set"

# PROD_VPS_PASSWORD
gh secret set PROD_VPS_PASSWORD \
    --body "rabbitHole0+" \
    && print_success "PROD_VPS_PASSWORD set"

# ===================================================================
# SHARED SECRETS
# ===================================================================

print_header "🔑 SHARED SECRETS (All Environments)"

echo "Setting up shared secrets..."
echo ""

# ANTHROPIC_API_KEY
# IMPORTANT: Replace with your actual API key from console.anthropic.com
print_warning "ANTHROPIC_API_KEY: Replace placeholder with your actual key"
echo "Get your key from: https://console.anthropic.com/settings/keys"

# OPENAI_API_KEY
# IMPORTANT: Replace with your actual API key from platform.openai.com
print_warning "OPENAI_API_KEY: Replace placeholder with your actual key"
echo "Get your key from: https://platform.openai.com/api-keys"

# SUPABASE_ACCESS_TOKEN
# IMPORTANT: Replace with your actual token from supabase.com/dashboard
print_warning "SUPABASE_ACCESS_TOKEN: Replace placeholder with your actual token"
echo "Get your token from: https://supabase.com/dashboard/account/tokens"

# ===================================================================
# VERIFICATION
# ===================================================================

print_header "🔍 VERIFICATION"

echo "Listing all configured secrets..."
echo ""

gh secret list

echo ""
print_success "All secrets configured successfully!"
echo ""

print_info "Next steps:"
echo "  1. Verify secrets in GitHub: https://github.com/$REPO/settings/secrets/actions"
echo "  2. Test workflows by pushing to dev/staging/main branches"
echo "  3. Monitor GitHub Actions logs for any secret-related issues"
echo ""

print_warning "SECURITY REMINDERS:"
echo "  - Never log secret values in workflows"
echo "  - Rotate keys quarterly (use scripts/rotate-secrets.ts)"
echo "  - Review access to GitHub Secrets regularly"
echo ""

print_success "Setup complete! 🎉"

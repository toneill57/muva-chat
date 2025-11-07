#!/bin/bash

# ===================================================================
# GitHub Secrets Configuration Script
# ===================================================================
# This script template helps you configure GitHub Secrets
# for the three-environment CI/CD setup.
#
# IMPORTANT: This script contains TEMPLATE values only.
# You must replace all placeholders with your actual secret values.
#
# Usage:
#   1. Install GitHub CLI: brew install gh
#   2. Login to GitHub: gh auth login
#   3. Edit this script with your actual values
#   4. Run: ./scripts/setup-github-secrets.sh
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

print_header "⚠️  IMPORTANT: TEMPLATE ONLY"

echo ""
print_warning "This script contains TEMPLATE values only!"
echo ""
echo "Before running, you must:"
echo "  1. Replace ALL placeholder values with your actual secrets"
echo "  2. Get secrets from:"
echo "     - Supabase: https://supabase.com/dashboard"
echo "     - Anthropic: https://console.anthropic.com/settings/keys"
echo "     - OpenAI: https://platform.openai.com/api-keys"
echo ""
echo "Secrets to configure:"
echo "  - Development (4 secrets): DEV_SUPABASE_*"
echo "  - Staging (8 secrets): STAGING_SUPABASE_*, STAGING_VPS_*"
echo "  - Production (7 secrets): PROD_SUPABASE_*, PROD_VPS_*"
echo "  - Shared (3 secrets): ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE_ACCESS_TOKEN"
echo ""
print_info "See docs/infrastructure/three-environments/GITHUB_SECRETS_SETUP.md for detailed instructions"
echo ""

# Uncomment and fill in the sections below with your actual values

# # ===================================================================
# # DEVELOPMENT ENVIRONMENT SECRETS
# # ===================================================================
#
# print_header "📦 DEVELOPMENT ENVIRONMENT SECRETS"
#
# gh secret set DEV_SUPABASE_URL --body "YOUR_DEV_SUPABASE_URL"
# gh secret set DEV_SUPABASE_ANON_KEY --body "YOUR_DEV_ANON_KEY"
# gh secret set DEV_SUPABASE_SERVICE_ROLE_KEY --body "YOUR_DEV_SERVICE_ROLE_KEY"
# gh secret set DEV_SUPABASE_PROJECT_ID --body "YOUR_DEV_PROJECT_ID"

# # ===================================================================
# # STAGING ENVIRONMENT SECRETS
# # ===================================================================
#
# print_header "🚀 STAGING ENVIRONMENT SECRETS"
#
# gh secret set STAGING_SUPABASE_URL --body "YOUR_STAGING_SUPABASE_URL"
# gh secret set STAGING_SUPABASE_ANON_KEY --body "YOUR_STAGING_ANON_KEY"
# gh secret set STAGING_SUPABASE_SERVICE_ROLE_KEY --body "YOUR_STAGING_SERVICE_ROLE_KEY"
# gh secret set STAGING_SUPABASE_PROJECT_ID --body "YOUR_STAGING_PROJECT_ID"
# gh secret set STAGING_SUPABASE_DB_PASSWORD --body "YOUR_STAGING_DB_PASSWORD"
# gh secret set STAGING_VPS_HOST --body "YOUR_STAGING_VPS_HOST"
# gh secret set STAGING_VPS_USER --body "YOUR_STAGING_VPS_USER"
# gh secret set STAGING_VPS_PASSWORD --body "YOUR_STAGING_VPS_PASSWORD"

# # ===================================================================
# # PRODUCTION ENVIRONMENT SECRETS
# # ===================================================================
#
# print_header "🏭 PRODUCTION ENVIRONMENT SECRETS"
#
# gh secret set PROD_SUPABASE_URL --body "YOUR_PROD_SUPABASE_URL"
# gh secret set PROD_SUPABASE_ANON_KEY --body "YOUR_PROD_ANON_KEY"
# gh secret set PROD_SUPABASE_SERVICE_ROLE_KEY --body "YOUR_PROD_SERVICE_ROLE_KEY"
# gh secret set PROD_SUPABASE_PROJECT_ID --body "YOUR_PROD_PROJECT_ID"
# gh secret set PROD_VPS_HOST --body "YOUR_PROD_VPS_HOST"
# gh secret set PROD_VPS_USER --body "YOUR_PROD_VPS_USER"
# gh secret set PROD_VPS_PASSWORD --body "YOUR_PROD_VPS_PASSWORD"

# # ===================================================================
# # SHARED SECRETS
# # ===================================================================
#
# print_header "🔑 SHARED SECRETS (All Environments)"
#
# gh secret set ANTHROPIC_API_KEY --body "YOUR_ANTHROPIC_API_KEY"
# gh secret set OPENAI_API_KEY --body "YOUR_OPENAI_API_KEY"
# gh secret set SUPABASE_ACCESS_TOKEN --body "YOUR_SUPABASE_ACCESS_TOKEN"

# # ===================================================================
# # VERIFICATION
# # ===================================================================
#
# print_header "🔍 VERIFICATION"
#
# echo "Listing all configured secrets..."
# echo ""
#
# gh secret list
#
# echo ""
# print_success "All secrets configured successfully!"
# print_info "Next steps:"
# echo "  1. Verify secrets in GitHub: https://github.com/$REPO/settings/secrets/actions"
# echo "  2. Test workflows by pushing to dev/staging/main branches"

print_warning "Script template loaded. Edit with your actual values before running."
echo ""
print_info "For automatic setup with your values already configured,"
print_info "see the documented setup instructions in GITHUB_SECRETS_SETUP.md"

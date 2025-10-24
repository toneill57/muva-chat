/**
 * Hook: useStaffTenantValidation
 *
 * Validates that the authenticated staff member belongs to the current tenant subdomain.
 * Prevents cross-tenant access by logging out staff when they navigate to a different tenant's subdomain.
 *
 * Usage:
 * ```tsx
 * function StaffComponent() {
 *   const { isValidating, error } = useStaffTenantValidation()
 *
 *   if (isValidating) return <div>Validating access...</div>
 *   if (error) return <div>Access denied</div>
 *
 *   return <div>Component content</div>
 * }
 * ```
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface StaffTenantValidationResult {
  isValidating: boolean
  error: string | null
}

export function useStaffTenantValidation(): StaffTenantValidationResult {
  const router = useRouter()
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function validateTenantAccess() {
      try {
        // 1. Get current subdomain from hostname
        const hostname = window.location.hostname
        const currentSubdomain = hostname.split('.')[0]

        // Skip validation for localhost without subdomain
        if (currentSubdomain === 'localhost' || hostname === 'localhost:3000') {
          setIsValidating(false)
          return
        }

        // 2. Get staff token and info from localStorage
        const token = localStorage.getItem('staff_token')
        const staffInfoStr = localStorage.getItem('staff_info')

        if (!token || !staffInfoStr) {
          console.log('[useStaffTenantValidation] No token or staff info found')
          setError('Not authenticated')
          setIsValidating(false)
          router.push('/staff/login')
          return
        }

        // 3. Parse staff info to get tenant_id
        const staffInfo = JSON.parse(staffInfoStr)
        const tokenTenantId = staffInfo.tenant_id

        if (!tokenTenantId) {
          console.log('[useStaffTenantValidation] No tenant_id in staff info')
          setError('Invalid authentication')
          setIsValidating(false)
          handleLogout(currentSubdomain)
          return
        }

        // 4. Fetch tenant info for current subdomain
        const response = await fetch(`/api/tenant/resolve?subdomain=${currentSubdomain}`)

        if (!response.ok) {
          console.error('[useStaffTenantValidation] Failed to fetch tenant info:', response.status)
          setError('Failed to validate tenant')
          setIsValidating(false)
          return
        }

        const data = await response.json()

        if (!data.success || !data.tenant_id) {
          console.error('[useStaffTenantValidation] No tenant found for subdomain:', currentSubdomain)
          setError('Tenant not found')
          setIsValidating(false)
          return
        }

        // 5. Validate: token tenant_id MUST match current subdomain's tenant_id
        if (tokenTenantId !== data.tenant_id) {
          console.warn('[useStaffTenantValidation] 🚨 CROSS-TENANT ACCESS BLOCKED:', {
            token_tenant: tokenTenantId,
            current_tenant: data.tenant_id,
            current_subdomain: currentSubdomain
          })

          setError('Access denied: Wrong tenant')
          handleLogout(currentSubdomain)
          return
        }

        // ✅ Validation passed
        console.log('[useStaffTenantValidation] ✅ Tenant validation passed:', {
          subdomain: currentSubdomain,
          tenant_id: data.tenant_id
        })

        setIsValidating(false)
        setError(null)

      } catch (err) {
        console.error('[useStaffTenantValidation] Validation error:', err)
        setError(err instanceof Error ? err.message : 'Validation failed')
        setIsValidating(false)
      }
    }

    validateTenantAccess()
  }, [router])

  return { isValidating, error }
}

/**
 * Helper: Logout and redirect to tenant-specific login
 */
function handleLogout(subdomain: string) {
  console.log('[useStaffTenantValidation] Logging out due to tenant mismatch')

  // Clear authentication
  localStorage.removeItem('staff_token')
  localStorage.removeItem('staff_info')

  // Redirect to staff login (subdomain already in hostname)
  window.location.href = '/staff/login'
}

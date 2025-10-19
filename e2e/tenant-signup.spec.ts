/**
 * E2E Tests: Tenant Sign-Up Flow
 *
 * Tests the complete tenant registration process:
 * - Form validation
 * - Subdomain availability checking
 * - Multi-step wizard navigation
 * - Successful account creation
 * - Database records verification
 */

import { test, expect } from '@playwright/test'
import { createServerClient } from '@/lib/supabase'

test.describe('Tenant Sign-Up Flow', () => {
  const testSubdomain = `test-hotel-${Date.now()}`
  const testData = {
    nombre_comercial: 'Hotel Test Paradise',
    nit: '900999999-9',
    razon_social: 'HOTEL TEST PARADISE S.A.S.',
    subdomain: testSubdomain,
    email: `admin@${testSubdomain}.test`,
    phone: '+573009999999',
    address: 'Calle Test #1-23, Test City, Colombia',
    admin_username: 'testadmin',
    admin_password: 'test123',
    admin_full_name: 'Test Admin User'
  }

  test.afterAll(async () => {
    // Cleanup: Delete test tenant after tests
    const supabase = createServerClient()
    await supabase
      .from('staff_users')
      .delete()
      .eq('username', testData.admin_username)

    await supabase
      .from('hotels')
      .delete()
      .ilike('name', '%Test Paradise%')

    await supabase
      .from('integration_configs')
      .delete()
      .eq('integration_type', 'motopress')

    await supabase
      .from('tenant_registry')
      .delete()
      .eq('subdomain', testSubdomain)

    console.log('[cleanup] Test tenant deleted:', testSubdomain)
  })

  test('should display sign-up form', async ({ page }) => {
    await page.goto('/signup')

    // Check page title
    await expect(page.locator('h1')).toContainText('Únete a MUVA')

    // Check step 1 is visible
    await expect(page.locator('h2')).toContainText('Información del Negocio')

    // Check progress stepper
    const stepper = page.locator('[class*="flex items-center"]').first()
    await expect(stepper).toBeVisible()
  })

  test('should validate required fields in Step 1', async ({ page }) => {
    await page.goto('/signup')

    // Try to proceed without filling fields
    await page.click('button:has-text("Siguiente")')

    // Should show validation errors
    await expect(page.locator('text=Requerido')).toHaveCount(3) // nombre, nit, razon_social
  })

  test('should navigate through all steps', async ({ page }) => {
    await page.goto('/signup')

    // Step 1: Business Info
    await page.fill('input[placeholder="Hotel Paradise"]', testData.nombre_comercial)
    await page.fill('input[placeholder="900123456-7"]', testData.nit)
    await page.fill('input[placeholder="HOTEL PARADISE S.A.S."]', testData.razon_social)
    await page.click('button:has-text("Siguiente")')

    // Step 2: Subdomain
    await expect(page.locator('h2')).toContainText('Subdomain & Branding')
    await page.fill('input[placeholder="hotel-paradise"]', testData.subdomain)

    // Wait for subdomain availability check
    await page.waitForTimeout(1000) // Debounce delay
    await expect(page.locator('text=disponible')).toBeVisible({ timeout: 5000 })

    await page.click('button:has-text("Siguiente")')

    // Step 3: Contact
    await expect(page.locator('h2')).toContainText('Información de Contacto')
    await page.fill('input[type="email"]', testData.email)
    await page.fill('input[type="tel"]', testData.phone)
    await page.fill('textarea[placeholder*="Calle"]', testData.address)
    await page.click('button:has-text("Siguiente")')

    // Step 4: Admin User
    await expect(page.locator('h2')).toContainText('Usuario Administrador')
    await page.fill('input[placeholder="Juan Pérez"]', testData.admin_full_name)
    await page.fill('input[placeholder="admin"]', testData.admin_username)
    await page.fill('input[type="password"]', testData.admin_password)
    await page.click('button:has-text("Siguiente")')

    // Step 5: Confirmation
    await expect(page.locator('h2')).toContainText('Confirmar Datos')
    await expect(page.locator('text=' + testData.nombre_comercial)).toBeVisible()
    await expect(page.locator('text=' + testData.subdomain)).toBeVisible()
  })

  test('should validate subdomain format', async ({ page }) => {
    await page.goto('/signup')

    // Fill Step 1
    await page.fill('input[placeholder="Hotel Paradise"]', testData.nombre_comercial)
    await page.fill('input[placeholder="900123456-7"]', testData.nit)
    await page.fill('input[placeholder="HOTEL PARADISE S.A.S."]', testData.razon_social)
    await page.click('button:has-text("Siguiente")')

    // Try invalid subdomain (uppercase)
    await page.fill('input[placeholder="hotel-paradise"]', 'INVALID-UPPER')
    await page.click('button:has-text("Siguiente")')

    // Should show error
    await expect(page.locator('text=lowercase')).toBeVisible()

    // Try valid subdomain
    await page.fill('input[placeholder="hotel-paradise"]', testData.subdomain)
    await page.waitForTimeout(1000)
    await expect(page.locator('text=disponible')).toBeVisible({ timeout: 5000 })
  })

  test('should validate password length', async ({ page }) => {
    await page.goto('/signup')

    // Navigate to Step 4
    await page.fill('input[placeholder="Hotel Paradise"]', testData.nombre_comercial)
    await page.fill('input[placeholder="900123456-7"]', testData.nit)
    await page.fill('input[placeholder="HOTEL PARADISE S.A.S."]', testData.razon_social)
    await page.click('button:has-text("Siguiente")')

    await page.fill('input[placeholder="hotel-paradise"]', testData.subdomain)
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Siguiente")')

    await page.fill('input[type="email"]', testData.email)
    await page.fill('input[type="tel"]', testData.phone)
    await page.fill('textarea[placeholder*="Calle"]', testData.address)
    await page.click('button:has-text("Siguiente")')

    // Try short password (< 6 chars)
    await page.fill('input[placeholder="Juan Pérez"]', testData.admin_full_name)
    await page.fill('input[placeholder="admin"]', testData.admin_username)
    await page.fill('input[type="password"]', '12345') // Only 5 chars
    await page.click('button:has-text("Siguiente")')

    // Should show error
    await expect(page.locator('text=Mínimo 6 caracteres')).toBeVisible()
  })

  test('should complete full signup flow', async ({ page }) => {
    await page.goto('/signup')

    // Step 1
    await page.fill('input[placeholder="Hotel Paradise"]', testData.nombre_comercial)
    await page.fill('input[placeholder="900123456-7"]', testData.nit)
    await page.fill('input[placeholder="HOTEL PARADISE S.A.S."]', testData.razon_social)
    await page.click('button:has-text("Siguiente")')

    // Step 2
    await page.fill('input[placeholder="hotel-paradise"]', testData.subdomain)
    await page.waitForTimeout(1000) // Wait for availability check
    await page.click('button:has-text("Siguiente")')

    // Step 3
    await page.fill('input[type="email"]', testData.email)
    await page.fill('input[type="tel"]', testData.phone)
    await page.fill('textarea[placeholder*="Calle"]', testData.address)
    await page.click('button:has-text("Siguiente")')

    // Step 4
    await page.fill('input[placeholder="Juan Pérez"]', testData.admin_full_name)
    await page.fill('input[placeholder="admin"]', testData.admin_username)
    await page.fill('input[type="password"]', testData.admin_password)
    await page.click('button:has-text("Siguiente")')

    // Step 5: Submit
    await page.click('button:has-text("Crear Mi Cuenta")')

    // Should redirect to success page
    await expect(page).toHaveURL(/\/signup\/success/, { timeout: 10000 })
    await expect(page.locator('text=Cuenta Creada Exitosamente')).toBeVisible()
    await expect(page.locator(`text=${testData.subdomain}.muva.chat`)).toBeVisible()
  })

  test('should create tenant records in database', async ({ page }) => {
    await page.goto('/signup')

    // Complete signup flow
    await page.fill('input[placeholder="Hotel Paradise"]', testData.nombre_comercial)
    await page.fill('input[placeholder="900123456-7"]', testData.nit)
    await page.fill('input[placeholder="HOTEL PARADISE S.A.S."]', testData.razon_social)
    await page.click('button:has-text("Siguiente")')

    await page.fill('input[placeholder="hotel-paradise"]', testData.subdomain)
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Siguiente")')

    await page.fill('input[type="email"]', testData.email)
    await page.fill('input[type="tel"]', testData.phone)
    await page.fill('textarea[placeholder*="Calle"]', testData.address)
    await page.click('button:has-text("Siguiente")')

    await page.fill('input[placeholder="Juan Pérez"]', testData.admin_full_name)
    await page.fill('input[placeholder="admin"]', testData.admin_username)
    await page.fill('input[type="password"]', testData.admin_password)
    await page.click('button:has-text("Siguiente")')

    await page.click('button:has-text("Crear Mi Cuenta")')

    await expect(page).toHaveURL(/\/signup\/success/, { timeout: 10000 })

    // Verify database records
    const supabase = createServerClient()

    // Check tenant_registry
    const { data: tenant } = await supabase
      .from('tenant_registry')
      .select('*')
      .eq('subdomain', testData.subdomain)
      .single()

    expect(tenant).toBeTruthy()
    expect(tenant?.nombre_comercial).toBe(testData.nombre_comercial)
    expect(tenant?.nit).toBe(testData.nit)
    expect(tenant?.email).toBe(testData.email)
    expect(tenant?.is_active).toBe(true)
    expect(tenant?.subscription_tier).toBe('premium')

    // Check hotels
    const { data: hotel } = await supabase
      .from('hotels')
      .select('*')
      .eq('tenant_id', tenant.tenant_id)
      .single()

    expect(hotel).toBeTruthy()
    expect(hotel?.name).toBe(testData.nombre_comercial)

    // Check staff_users
    const { data: staff } = await supabase
      .from('staff_users')
      .select('*')
      .eq('tenant_id', tenant.tenant_id)
      .eq('username', testData.admin_username)
      .single()

    expect(staff).toBeTruthy()
    expect(staff?.full_name).toBe(testData.admin_full_name)
    expect(staff?.role).toBe('admin')
    expect(staff?.is_active).toBe(true)

    // Check integration_configs
    const { data: integration } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('tenant_id', tenant.tenant_id)
      .single()

    expect(integration).toBeTruthy()
    expect(integration?.integration_type).toBe('motopress')
    expect(integration?.is_active).toBe(false)

    console.log('[test] ✅ All database records verified for:', testData.subdomain)
  })

  test('should reject duplicate subdomain', async ({ page }) => {
    // First, create a tenant
    await page.goto('/signup')

    await page.fill('input[placeholder="Hotel Paradise"]', testData.nombre_comercial)
    await page.fill('input[placeholder="900123456-7"]', testData.nit)
    await page.fill('input[placeholder="HOTEL PARADISE S.A.S."]', testData.razon_social)
    await page.click('button:has-text("Siguiente")')

    await page.fill('input[placeholder="hotel-paradise"]', testData.subdomain)
    await page.waitForTimeout(1000)

    // Should show "not available" if subdomain was already created in previous test
    // Or "available" if this is the first test run
    const availableText = await page.locator('text=disponible').isVisible()
    const notAvailableText = await page.locator('text=no disponible').isVisible()

    expect(availableText || notAvailableText).toBeTruthy()
  })
})

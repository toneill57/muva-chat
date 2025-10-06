/**
 * SIRE Automation (Puppeteer)
 *
 * Automated submission to SIRE (Sistema de Información y Registro de Extranjeros)
 * via Puppeteer browser automation.
 *
 * SIRE does NOT provide a public API, so we use Puppeteer to:
 * 1. Login with tenant credentials
 * 2. Navigate to registration form
 * 3. Fill 13 campos obligatorios
 * 4. Submit and capture confirmation number
 * 5. Screenshot for audit trail
 *
 * IMPORTANTE: Puppeteer scripts are fragile and may break if SIRE updates UI.
 * Selectors need to be updated when SIRE website changes.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import type { SIREData } from '../compliance-chat-engine';

/**
 * SIRE submission result
 */
export interface SIRESubmissionResult {
  success: boolean;
  referenceNumber?: string;        // SIRE confirmation number
  error?: string;                  // Error message if failed
  screenshot?: string;             // Base64 screenshot for audit
  submittedAt: string;             // ISO timestamp
  duration?: number;               // Execution time in ms
}

/**
 * SIRE credentials (from tenant_compliance_credentials table)
 */
export interface SIRECredentials {
  username: string;
  password: string;
}

/**
 * SIRE Automation Class
 *
 * Handles Puppeteer automation for SIRE submissions.
 */
export class SIREAutomation {
  private browser: Browser | null = null;
  private readonly SIRE_URL = 'https://sire.hospedajes.gov.co/';
  private readonly TIMEOUT = 30000; // 30s timeout
  private readonly MAX_RETRIES = 3;

  /**
   * Submit SIRE data via Puppeteer automation
   *
   * @param sireData - 13 campos oficiales SIRE
   * @param credentials - SIRE username/password
   * @returns Submission result with reference number
   */
  async submitToSIRE(
    sireData: SIREData,
    credentials: SIRECredentials
  ): Promise<SIRESubmissionResult> {
    const startTime = Date.now();

    console.log('[sire-automation] Starting SIRE submission...');
    console.log('[sire-automation] Data:', {
      hotel: sireData.codigo_hotel,
      ciudad: sireData.codigo_ciudad,
      documento: sireData.numero_identificacion,
      nombre: `${sireData.nombres} ${sireData.primer_apellido}`,
    });

    try {
      // Launch browser
      this.browser = await puppeteer.launch({
        headless: true, // Set to false for debugging
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      const page = await this.browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to SIRE
      console.log('[sire-automation] Navigating to SIRE...');
      await page.goto(this.SIRE_URL, {
        waitUntil: 'networkidle2',
        timeout: this.TIMEOUT
      });

      // Login
      console.log('[sire-automation] Logging in...');
      await this.login(page, credentials);

      // Navigate to registration form
      console.log('[sire-automation] Navigating to registration form...');
      await this.navigateToRegistrationForm(page);

      // Fill form with SIRE data
      console.log('[sire-automation] Filling form with 13 campos...');
      await this.fillSIREForm(page, sireData);

      // Submit form
      console.log('[sire-automation] Submitting form...');
      const referenceNumber = await this.submitForm(page);

      // Screenshot for audit
      const screenshot = await page.screenshot({ encoding: 'base64' }) as string;

      // Cleanup
      await this.browser.close();
      this.browser = null;

      const duration = Date.now() - startTime;

      console.log('[sire-automation] ✅ Submission successful!', {
        referenceNumber,
        duration: `${duration}ms`
      });

      return {
        success: true,
        referenceNumber,
        screenshot,
        submittedAt: new Date().toISOString(),
        duration
      };

    } catch (error) {
      // Capture error screenshot if browser is still open
      let errorScreenshot: string | undefined;

      if (this.browser) {
        try {
          const pages = await this.browser.pages();
          if (pages.length > 0) {
            errorScreenshot = await pages[0].screenshot({ encoding: 'base64' }) as string;
          }
        } catch (screenshotError) {
          console.error('[sire-automation] Failed to capture error screenshot:', screenshotError);
        }

        await this.browser.close();
        this.browser = null;
      }

      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[sire-automation] ❌ Submission failed:', {
        error: errorMessage,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: errorMessage,
        screenshot: errorScreenshot,
        submittedAt: new Date().toISOString(),
        duration
      };
    }
  }

  /**
   * Login to SIRE system
   *
   * NOTA: Estos selectores son PROVISIONALES y deben actualizarse
   * con los selectores reales del sitio SIRE.
   */
  private async login(page: Page, credentials: SIRECredentials): Promise<void> {
    try {
      // Wait for login form
      await page.waitForSelector('input[name="username"], #username', { timeout: this.TIMEOUT });

      // Fill username
      await page.type('input[name="username"], #username', credentials.username, { delay: 50 });

      // Fill password
      await page.type('input[name="password"], #password', credentials.password, { delay: 50 });

      // Click login button
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: this.TIMEOUT }),
        page.click('button[type="submit"], input[type="submit"], #login-button')
      ]);

      // Verify login success (check for dashboard or profile element)
      const loginSuccess = await page.evaluate(() => {
        // Check if we're redirected to dashboard
        return !document.querySelector('.login-error, .error-message');
      });

      if (!loginSuccess) {
        throw new Error('Login failed - Invalid credentials or SIRE error');
      }

      console.log('[sire-automation] Login successful');

    } catch (error) {
      throw new Error(`SIRE login failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Navigate to guest registration form
   *
   * NOTA: Estos selectores son PROVISIONALES.
   */
  private async navigateToRegistrationForm(page: Page): Promise<void> {
    try {
      // Look for "Registrar Extranjero" or similar link
      const linkSelectors = [
        'a[href*="registro"]',
        'a[href*="extranjero"]',
        'a:has-text("Registrar")',
        '#menu-registro'
      ];

      for (const selector of linkSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: this.TIMEOUT }),
            page.click(selector)
          ]);
          break;
        } catch {
          // Try next selector
          continue;
        }
      }

      // Wait for registration form to load
      await page.waitForSelector('form#sire-registration, form[name="registro"]', {
        timeout: this.TIMEOUT
      });

      console.log('[sire-automation] Registration form loaded');

    } catch (error) {
      throw new Error(`Failed to navigate to registration form: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Fill SIRE registration form with 13 campos
   *
   * NOTA: Estos selectores son PROVISIONALES y deben actualizarse
   * con los IDs/nombres reales de los campos del formulario SIRE.
   */
  private async fillSIREForm(page: Page, sireData: SIREData): Promise<void> {
    try {
      // Campo 1: Código del hotel
      await this.fillField(page, '#codigo_hotel, [name="codigo_hotel"]', sireData.codigo_hotel);

      // Campo 2: Código de ciudad
      await this.fillField(page, '#codigo_ciudad, [name="codigo_ciudad"]', sireData.codigo_ciudad);

      // Campo 3: Tipo de documento (dropdown)
      await this.selectOption(page, '#tipo_documento, [name="tipo_documento"]', sireData.tipo_documento);

      // Campo 4: Número de identificación
      await this.fillField(page, '#numero_identificacion, [name="numero_identificacion"]', sireData.numero_identificacion);

      // Campo 5: Código nacionalidad
      await this.fillField(page, '#codigo_nacionalidad, [name="codigo_nacionalidad"]', sireData.codigo_nacionalidad);

      // Campo 6: Primer apellido
      await this.fillField(page, '#primer_apellido, [name="primer_apellido"]', sireData.primer_apellido);

      // Campo 7: Segundo apellido (puede estar vacío)
      await this.fillField(page, '#segundo_apellido, [name="segundo_apellido"]', sireData.segundo_apellido);

      // Campo 8: Nombres
      await this.fillField(page, '#nombres, [name="nombres"]', sireData.nombres);

      // Campo 9: Tipo de movimiento (dropdown)
      await this.selectOption(page, '#tipo_movimiento, [name="tipo_movimiento"]', sireData.tipo_movimiento);

      // Campo 10: Fecha del movimiento
      await this.fillField(page, '#fecha_movimiento, [name="fecha_movimiento"]', sireData.fecha_movimiento);

      // Campo 11: Lugar de procedencia
      await this.fillField(page, '#lugar_procedencia, [name="lugar_procedencia"]', sireData.lugar_procedencia);

      // Campo 12: Lugar de destino
      await this.fillField(page, '#lugar_destino, [name="lugar_destino"]', sireData.lugar_destino);

      // Campo 13: Fecha de nacimiento
      await this.fillField(page, '#fecha_nacimiento, [name="fecha_nacimiento"]', sireData.fecha_nacimiento);

      console.log('[sire-automation] Form filled successfully');

    } catch (error) {
      throw new Error(`Failed to fill SIRE form: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Fill text input field
   */
  private async fillField(page: Page, selector: string, value: string): Promise<void> {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.focus(selector);
      await page.evaluate((sel) => {
        const element = document.querySelector(sel) as HTMLInputElement;
        if (element) element.value = '';
      }, selector);
      await page.type(selector, value, { delay: 30 });
    } catch (error) {
      console.warn(`[sire-automation] Failed to fill field ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Select option from dropdown
   */
  private async selectOption(page: Page, selector: string, value: string): Promise<void> {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.select(selector, value);
    } catch (error) {
      console.warn(`[sire-automation] Failed to select option ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Submit registration form and capture confirmation number
   *
   * NOTA: El selector del botón submit y del número de confirmación
   * son PROVISIONALES.
   */
  private async submitForm(page: Page): Promise<string> {
    try {
      // Click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '#btn-submit',
        '#btn-guardar'
      ];

      for (const selector of submitSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: this.TIMEOUT }),
            page.click(selector)
          ]);
          break;
        } catch {
          continue;
        }
      }

      // Wait for confirmation page/modal
      const confirmationSelectors = [
        '.confirmation-number',
        '#confirmation-number',
        '.numero-confirmacion',
        '[data-confirmation]'
      ];

      let referenceNumber = '';

      for (const selector of confirmationSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 10000 });
          referenceNumber = await page.$eval(selector, el => el.textContent?.trim() || '');
          if (referenceNumber) break;
        } catch {
          continue;
        }
      }

      if (!referenceNumber) {
        // Try to extract from page text
        const pageText = await page.evaluate(() => document.body.textContent || '');
        const match = pageText.match(/(?:confirmación|confirmation|número|number)[:\s]+([A-Z0-9-]+)/i);
        if (match) {
          referenceNumber = match[1];
        }
      }

      if (!referenceNumber) {
        throw new Error('Could not extract confirmation/reference number from SIRE response');
      }

      console.log('[sire-automation] Confirmation number:', referenceNumber);

      return referenceNumber;

    } catch (error) {
      throw new Error(`Failed to submit form: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Cleanup - close browser if still open
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

/**
 * Utility: Test SIRE connection (verify credentials)
 *
 * @param credentials - SIRE credentials to test
 * @returns true if login successful
 */
export async function testSIREConnection(credentials: SIRECredentials): Promise<boolean> {
  const automation = new SIREAutomation();

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://sire.hospedajes.gov.co/', { waitUntil: 'networkidle2' });

    // Attempt login
    await page.type('input[name="username"], #username', credentials.username);
    await page.type('input[name="password"], #password', credentials.password);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

    // Check if login successful
    const loginSuccess = await page.evaluate(() => {
      return !document.querySelector('.login-error, .error-message');
    });

    await browser.close();

    return loginSuccess;

  } catch (error) {
    console.error('[sire-automation] Connection test failed:', error);
    return false;
  } finally {
    await automation.cleanup();
  }
}

/**
 * MotoPress Credentials Helper
 *
 * Handles backward compatibility for MotoPress API credentials.
 * Supports both legacy and new credential formats.
 */

import { decryptCredentials } from '@/lib/admin-auth'

export interface MotoPresCredentials {
  apiKey: string
  consumerSecret: string
  siteUrl: string
}

/**
 * DEPRECATED CREDENTIALS FORMAT WARNING
 *
 * Legacy format that may exist in database:
 * {
 *   "consumer_key": "admin",           // ⚠️ WordPress admin user (NOT API key)
 *   "consumer_secret": "Ehxu d1gy..." // ⚠️ WordPress admin password (NOT API secret)
 * }
 *
 * These are NOT valid MotoPress REST API credentials.
 * They appear to be WordPress admin credentials, which don't work for API calls.
 *
 * CORRECT FORMAT (MotoPress REST API):
 * {
 *   "api_key": "ck_xxxxx...",          // Consumer Key from WP REST API settings
 *   "consumer_secret": "cs_xxxxx..."   // Consumer Secret from WP REST API settings
 * }
 *
 * To fix: User must reconfigure at /accommodations/integrations
 * Do NOT use legacy credentials unless explicitly requested by user.
 */

/**
 * Extracts and decrypts MotoPress credentials from config_data.
 *
 * Supports multiple formats:
 * - New format: api_key (encrypted) + consumer_secret (encrypted)
 * - Legacy format: consumer_key (may be plain text) + consumer_secret (may be plain text)
 *
 * @param config_data - The config_data object from integration_configs table
 * @returns Decrypted credentials ready for MotoPresClient
 * @throws Error if credentials are missing or invalid
 */
export async function getDecryptedMotoPresCredentials(
  config_data: any
): Promise<MotoPresCredentials> {
  // Support both new (api_key) and legacy (consumer_key) formats
  const apiKeyField = config_data.api_key || config_data.consumer_key
  const consumerSecretField = config_data.consumer_secret
  const siteUrl = config_data.site_url

  // Validate required fields
  if (!apiKeyField) {
    throw new Error(
      'Missing MotoPress Consumer Key. Please configure at /accommodations/integrations'
    )
  }

  if (!consumerSecretField) {
    throw new Error(
      'Missing MotoPress Consumer Secret. Please configure at /accommodations/integrations'
    )
  }

  if (!siteUrl) {
    throw new Error(
      'Missing MotoPress Site URL. Please configure at /accommodations/integrations'
    )
  }

  // Try to decrypt credentials (new format), fallback to plain text (legacy format)
  let apiKey: string
  let consumerSecret: string
  let isLegacyFormat = false

  try {
    // Attempt decryption (new format)
    apiKey = await decryptCredentials(apiKeyField)
    consumerSecret = await decryptCredentials(consumerSecretField)

    // Check if using legacy field name
    if (config_data.consumer_key && !config_data.api_key) {
      isLegacyFormat = true
      console.warn(
        '[motopress-credentials] ⚠️ LEGACY FORMAT: Using consumer_key instead of api_key. Please reconfigure at /accommodations/integrations'
      )
    }
  } catch (error) {
    // Decryption failed - credentials are in plain text (legacy format)
    isLegacyFormat = true
    apiKey = apiKeyField
    consumerSecret = consumerSecretField

    console.warn(
      '[motopress-credentials] ⚠️ LEGACY FORMAT: Credentials are not encrypted. Please reconfigure at /accommodations/integrations for better security'
    )

    // Additional warning if credentials look like WordPress admin credentials
    if (
      !apiKey.startsWith('ck_') &&
      !apiKey.startsWith('cs_') &&
      apiKey.length < 30
    ) {
      console.error(
        '[motopress-credentials] ⚠️ INVALID CREDENTIALS: These appear to be WordPress admin credentials, NOT MotoPress REST API keys. API calls will likely fail. Please reconfigure with proper Consumer Key (starts with ck_) and Consumer Secret (starts with cs_) from WordPress REST API settings.'
      )
    }
  }

  // Log format being used (for debugging)
  const formatType = isLegacyFormat ? 'LEGACY' : 'NEW'
  const encryptionStatus = isLegacyFormat ? 'PLAIN TEXT' : 'ENCRYPTED'
  console.log(
    `[motopress-credentials] Format: ${formatType}, Encryption: ${encryptionStatus}, Site: ${siteUrl}`
  )

  return {
    apiKey,
    consumerSecret,
    siteUrl
  }
}

/**
 * Validates that credentials are in the correct MotoPress REST API format.
 *
 * Valid credentials:
 * - Consumer Key starts with "ck_"
 * - Consumer Secret starts with "cs_"
 * - Both are long alphanumeric strings (40+ chars)
 *
 * @param credentials - The credentials to validate
 * @returns true if valid, false otherwise
 */
export function validateMotoPresCredentials(
  credentials: MotoPresCredentials
): boolean {
  const { apiKey, consumerSecret } = credentials

  // Check if credentials look like valid MotoPress REST API keys
  const isValidApiKey = apiKey.startsWith('ck_') && apiKey.length >= 40
  const isValidSecret = consumerSecret.startsWith('cs_') && consumerSecret.length >= 40

  if (!isValidApiKey) {
    console.error(
      `[motopress-credentials] Invalid Consumer Key format. Expected "ck_..." but got "${apiKey.substring(0, 10)}..."`
    )
  }

  if (!isValidSecret) {
    console.error(
      `[motopress-credentials] Invalid Consumer Secret format. Expected "cs_..." but got "${consumerSecret.substring(0, 10)}..."`
    )
  }

  return isValidApiKey && isValidSecret
}

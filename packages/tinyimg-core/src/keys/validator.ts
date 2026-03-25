import tinify from 'tinify'
import { maskKey } from './masker'

export async function validateKey(key: string): Promise<boolean> {
  try {
    tinify.key = key
    await tinify.validate()

    console.log(`✓ API key ${maskKey(key)} validated successfully`)
    return true
  }
  catch (error: any) {
    // Check if it's an AccountError (invalid credentials)
    if (error?.message?.includes('credentials') || error?.message?.includes('Unauthorized') || error?.constructor?.name === 'AccountError') {
      console.warn(`⚠ Invalid API key ${maskKey(key)} marked and skipped`)
      return false
    }
    // Re-throw network and server errors
    throw error
  }
}

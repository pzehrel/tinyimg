import { TinyPngHttpClient } from '../compress/http-client'
import { maskKey } from './masker'

export async function validateKey(key: string): Promise<boolean> {
  try {
    const client = new TinyPngHttpClient()
    const isValid = await client.validateKey(key)

    if (isValid) {
      console.log(`✓ API key ${maskKey(key)} validated successfully`)
      return true
    }
    else {
      console.warn(`⚠ Invalid API key ${maskKey(key)} marked and skipped`)
      return false
    }
  }
  catch (error: any) {
    // TinyPngHttpClient.validateKey() 对 5xx 抛出错误，对网络错误也抛出
    // 检查是否是认证错误（401/403），如果是则返回 false
    if (error?.statusCode === 401 || error?.statusCode === 403 || error?.errorCode === 'AUTH_FAILED') {
      console.warn(`⚠ Invalid API key ${maskKey(key)} marked and skipped`)
      return false
    }
    // Re-throw network and server errors
    throw error
  }
}

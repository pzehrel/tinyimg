import { TinyPngHttpClient } from '../compress/http-client'

export async function validateKey(key: string): Promise<boolean> {
  try {
    const client = new TinyPngHttpClient()
    const isValid = await client.validateKey(key)

    if (isValid) {
      return true
    }
    else {
      return false
    }
  }
  catch (error: any) {
    // TinyPngHttpClient.validateKey() 对 5xx 抛出错误，对网络错误也抛出
    // 检查是否是认证错误（401/403），如果是则返回 false
    if (error?.statusCode === 401 || error?.statusCode === 403 || error?.errorCode === 'AUTH_FAILED') {
      return false
    }
    // Re-throw network and server errors
    throw error
  }
}

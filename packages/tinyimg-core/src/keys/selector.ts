import { logWarning } from '../utils/logger'
import { maskKey } from './masker'
import { createQuotaTracker, queryQuota } from './quota'
import { validateKey } from './validator'

export interface KeySelection {
  key: string
  tracker: ReturnType<typeof createQuotaTracker>
}

// Strategy 1: Random (default)
export class RandomSelector {
  async select(keys: string[]): Promise<KeySelection | null> {
    const available = await this.getAvailableKeys(keys)
    if (available.length === 0)
      return null

    const randomIndex = Math.floor(Math.random() * available.length)
    const selected = available[randomIndex]
    return selected
  }

  protected async getAvailableKeys(keys: string[]): Promise<KeySelection[]> {
    const available: KeySelection[] = []

    for (const key of keys) {
      const isValid = await validateKey(key)
      if (!isValid)
        continue

      const remaining = await queryQuota(key)
      if (remaining === 0) {
        logWarning(`Key ${maskKey(key)} has no quota remaining`)
        continue
      }

      available.push({
        key,
        tracker: createQuotaTracker(key, remaining),
      })
    }

    return available
  }
}

// Strategy 2: Round-Robin
export class RoundRobinSelector extends RandomSelector {
  private currentIndex = 0

  async select(keys: string[]): Promise<KeySelection | null> {
    const available = await this.getAvailableKeys(keys)
    if (available.length === 0)
      return null

    const selected = available[this.currentIndex % available.length]
    this.currentIndex++
    return selected
  }

  reset(): void {
    this.currentIndex = 0
  }
}

// Strategy 3: Priority (use first available)
export class PrioritySelector extends RandomSelector {
  async select(keys: string[]): Promise<KeySelection | null> {
    const available = await this.getAvailableKeys(keys)
    if (available.length === 0)
      return null

    // Return first available key
    return available[0]
  }
}

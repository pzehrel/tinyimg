import { loadKeys } from '../config/loader.js'
import { RandomSelector, RoundRobinSelector, PrioritySelector, type KeySelection } from './selector.js'
import { AllKeysExhaustedError, NoValidKeysError } from '../errors/types.js'

export type KeyStrategy = 'random' | 'round-robin' | 'priority'

export class KeyPool {
  private keys: string[]
  private selector: RandomSelector | RoundRobinSelector | PrioritySelector
  private currentSelection: KeySelection | null = null

  constructor(strategy: KeyStrategy = 'random') {
    this.keys = loadKeys().map(k => k.key)

    if (this.keys.length === 0) {
      throw new NoValidKeysError('No API keys configured')
    }

    this.selector = this.createSelector(strategy)
  }

  private createSelector(strategy: KeyStrategy) {
    switch (strategy) {
      case 'random':
        return new RandomSelector()
      case 'round-robin':
        return new RoundRobinSelector()
      case 'priority':
        return new PrioritySelector()
      default:
        return new RandomSelector()
    }
  }

  async selectKey(): Promise<string> {
    // If current key has quota, use it
    if (this.currentSelection && !this.currentSelection.tracker.isZero()) {
      return this.currentSelection.key
    }

    // Need to select new key
    const selection = await this.selector.select(this.keys)

    if (!selection) {
      throw new AllKeysExhaustedError()
    }

    this.currentSelection = selection
    return selection.key
  }

  decrementQuota(): void {
    if (this.currentSelection) {
      this.currentSelection.tracker.decrement()
    }
  }

  getCurrentKey(): string | null {
    return this.currentSelection?.key ?? null
  }
}

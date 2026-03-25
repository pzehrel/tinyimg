export class AllKeysExhaustedError extends Error {
  constructor(message = 'All API keys have exhausted quota') {
    super(message)
    this.name = 'AllKeysExhaustedError'
  }
}

export class NoValidKeysError extends Error {
  constructor(message = 'No valid API keys available') {
    super(message)
    this.name = 'NoValidKeysError'
  }
}

export class AllCompressionFailedError extends Error {
  constructor(message = 'All compression methods failed') {
    super(message)
    this.name = 'AllCompressionFailedError'
  }
}

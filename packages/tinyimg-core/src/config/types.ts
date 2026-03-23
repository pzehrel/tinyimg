export interface KeyMetadata {
  key: string
  valid: boolean
  lastCheck: string // ISO 8601 timestamp
}

export interface ConfigFile {
  keys: KeyMetadata[]
}

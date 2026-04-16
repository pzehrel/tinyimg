export class AccountError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'AccountError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ClientError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ClientError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ServerError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ServerError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ConnectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'ConnectionError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

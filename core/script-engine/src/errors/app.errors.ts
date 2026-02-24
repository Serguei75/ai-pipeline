export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" not found`, 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}

export class LLMError extends AppError {
  constructor(message: string, public readonly cause?: unknown) {
    super(`LLM generation failed: ${message}`, 502)
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Cannot transition script from "${from}" to "${to}"`, 409)
  }
}

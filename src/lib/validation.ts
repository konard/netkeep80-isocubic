/**
 * JSON Schema validation for SpectralCube configurations
 * Uses Ajv (Another JSON Schema Validator) for validation
 */

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { SpectralCube } from '../types/cube'
import cubeSchema from '../types/cube-schema.json'

// Create Ajv instance with JSON Schema draft-07 support
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
})

// Add format validators (date-time, etc.)
addFormats(ajv)

// Compile the schema
const validateCubeSchema = ajv.compile(cubeSchema)

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Individual validation error
 */
export interface ValidationError {
  path: string
  message: string
  keyword: string
  params: Record<string, unknown>
}

/**
 * Validates a SpectralCube configuration against the JSON schema
 * @param cube - The cube configuration to validate
 * @returns Validation result with errors if any
 */
export function validateCube(cube: unknown): ValidationResult {
  const valid = validateCubeSchema(cube)

  if (valid) {
    return { valid: true, errors: [] }
  }

  const errors: ValidationError[] = (validateCubeSchema.errors || []).map((error) => ({
    path: error.instancePath || '/',
    message: error.message || 'Unknown validation error',
    keyword: error.keyword,
    params: error.params as Record<string, unknown>,
  }))

  return { valid: false, errors }
}

/**
 * Validates and returns a typed SpectralCube if valid
 * @param cube - The cube configuration to validate
 * @returns The validated cube or throws an error
 * @throws Error if validation fails
 */
export function validateAndParseCube(cube: unknown): SpectralCube {
  const result = validateCube(cube)

  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `${e.path}: ${e.message}`).join('; ')
    throw new Error(`Invalid SpectralCube configuration: ${errorMessages}`)
  }

  return cube as SpectralCube
}

/**
 * Checks if a value is a valid SpectralCube (type guard)
 * @param cube - The value to check
 * @returns True if the value is a valid SpectralCube
 */
export function isValidCube(cube: unknown): cube is SpectralCube {
  return validateCube(cube).valid
}

/**
 * Formats validation errors for display
 * @param errors - Array of validation errors
 * @returns Formatted error string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'No errors'
  }

  return errors
    .map((error, index) => {
      const path = error.path || 'root'
      return `${index + 1}. [${path}] ${error.message}`
    })
    .join('\n')
}

/**
 * Tests for Publishing API Types (TASK 48)
 */

import { describe, it, expect } from 'vitest'
import type { SpectralCube, CubeBase } from './cube'
import type { CubeCategory, CubeVisibility } from './community'
import type {
  ApiErrorCode,
  CreateCubeRequest,
  UpdateCubeRequest,
  ModerationStatus,
  ContentFlagType,
  RateLimitTier,
} from './publishing-api'
import {
  API_CONSTANTS,
  RATE_LIMIT_TIERS,
  ENDPOINT_RATE_LIMITS,
  PUBLISHING_API_STORAGE_KEYS,
  isValidApiErrorCode,
  isValidModerationStatus,
  isValidContentFlagType,
  getRateLimitTierFromRole,
  validateCreateCubeRequest,
  validateUpdateCubeRequest,
  createApiError,
  createApiResponse,
  createApiErrorResponse,
  canModerate,
  canManageAllCubes,
  canUpdateCube,
  canDeleteCube,
} from './publishing-api'

describe('Publishing API Types', () => {
  // ===========================================================================
  // Type Validation Tests
  // ===========================================================================

  describe('isValidApiErrorCode', () => {
    it('should return true for valid error codes', () => {
      const validCodes: ApiErrorCode[] = [
        'VALIDATION_ERROR',
        'AUTHENTICATION_REQUIRED',
        'PERMISSION_DENIED',
        'RESOURCE_NOT_FOUND',
        'RESOURCE_CONFLICT',
        'RATE_LIMIT_EXCEEDED',
        'CONTENT_MODERATION_FAILED',
        'CONTENT_FLAGGED',
        'INVALID_REQUEST',
        'SERVER_ERROR',
        'SERVICE_UNAVAILABLE',
      ]

      validCodes.forEach((code) => {
        expect(isValidApiErrorCode(code)).toBe(true)
      })
    })

    it('should return false for invalid error codes', () => {
      expect(isValidApiErrorCode('INVALID_CODE')).toBe(false)
      expect(isValidApiErrorCode('')).toBe(false)
      expect(isValidApiErrorCode('validation_error')).toBe(false) // Case-sensitive
    })
  })

  describe('isValidModerationStatus', () => {
    it('should return true for valid statuses', () => {
      const validStatuses: ModerationStatus[] = [
        'pending',
        'approved',
        'rejected',
        'flagged',
        'auto_approved',
      ]

      validStatuses.forEach((status) => {
        expect(isValidModerationStatus(status)).toBe(true)
      })
    })

    it('should return false for invalid statuses', () => {
      expect(isValidModerationStatus('invalid')).toBe(false)
      expect(isValidModerationStatus('')).toBe(false)
      expect(isValidModerationStatus('PENDING')).toBe(false)
    })
  })

  describe('isValidContentFlagType', () => {
    it('should return true for valid flag types', () => {
      const validTypes: ContentFlagType[] = [
        'inappropriate',
        'copyright',
        'spam',
        'offensive',
        'other',
      ]

      validTypes.forEach((type) => {
        expect(isValidContentFlagType(type)).toBe(true)
      })
    })

    it('should return false for invalid flag types', () => {
      expect(isValidContentFlagType('invalid')).toBe(false)
      expect(isValidContentFlagType('')).toBe(false)
    })
  })

  // ===========================================================================
  // Rate Limit Tests
  // ===========================================================================

  describe('getRateLimitTierFromRole', () => {
    it('should return correct tier for each role', () => {
      expect(getRateLimitTierFromRole('admin')).toBe('admin')
      expect(getRateLimitTierFromRole('moderator')).toBe('admin')
      expect(getRateLimitTierFromRole('creator')).toBe('creator')
      expect(getRateLimitTierFromRole('user')).toBe('authenticated')
    })

    it('should return anonymous for undefined role', () => {
      expect(getRateLimitTierFromRole(undefined)).toBe('anonymous')
    })
  })

  describe('RATE_LIMIT_TIERS', () => {
    it('should have configuration for all tiers', () => {
      const tiers: RateLimitTier[] = ['anonymous', 'authenticated', 'creator', 'premium', 'admin']

      tiers.forEach((tier) => {
        const config = RATE_LIMIT_TIERS[tier]
        expect(config).toBeDefined()
        expect(config.maxRequests).toBeGreaterThan(0)
        expect(config.windowSeconds).toBeGreaterThan(0)
        expect(typeof config.slidingWindow).toBe('boolean')
      })
    })

    it('should have increasing limits for higher tiers', () => {
      expect(RATE_LIMIT_TIERS.authenticated.maxRequests).toBeGreaterThan(
        RATE_LIMIT_TIERS.anonymous.maxRequests
      )
      expect(RATE_LIMIT_TIERS.creator.maxRequests).toBeGreaterThan(
        RATE_LIMIT_TIERS.authenticated.maxRequests
      )
      expect(RATE_LIMIT_TIERS.admin.maxRequests).toBeGreaterThan(
        RATE_LIMIT_TIERS.creator.maxRequests
      )
    })
  })

  describe('ENDPOINT_RATE_LIMITS', () => {
    it('should have rate limits for publishing endpoints', () => {
      const postCubes = ENDPOINT_RATE_LIMITS.find(
        (e) => e.path === '/api/cubes' && e.method === 'POST'
      )
      expect(postCubes).toBeDefined()
      expect(postCubes?.config.maxRequests).toBeLessThanOrEqual(100)
    })

    it('should have rate limits for flagging endpoint', () => {
      const flagEndpoint = ENDPOINT_RATE_LIMITS.find((e) => e.path.includes('flag'))
      expect(flagEndpoint).toBeDefined()
      // Flagging should have lower limits (per day)
      expect(flagEndpoint?.config.windowSeconds).toBeGreaterThanOrEqual(86400)
    })
  })

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe('validateCreateCubeRequest', () => {
    const validCube: SpectralCube = {
      id: 'test-cube',
      base: { color: [0.5, 0.5, 0.5], roughness: 0.5, transparency: 1.0 },
      meta: { name: 'Test' },
    }

    it('should validate a valid request', () => {
      const request: CreateCubeRequest = {
        cube: validCube,
        visibility: 'public',
        category: 'abstract',
        submitForModeration: true,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should reject missing cube', () => {
      const request = {
        cube: undefined as unknown as SpectralCube,
        visibility: 'public' as CubeVisibility,
        category: 'abstract' as CubeCategory,
        submitForModeration: true,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Cube configuration is required')
    })

    it('should reject cube without ID', () => {
      const request: CreateCubeRequest = {
        cube: { ...validCube, id: '' },
        visibility: 'public',
        category: 'abstract',
        submitForModeration: true,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Cube ID is required')
    })

    it('should reject cube without base color', () => {
      const request: CreateCubeRequest = {
        cube: {
          id: 'test',
          base: {} as CubeBase,
        },
        visibility: 'public',
        category: 'abstract',
        submitForModeration: true,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Cube base color is required')
    })

    it('should reject invalid visibility', () => {
      const request = {
        cube: validCube,
        visibility: 'invalid' as CubeVisibility,
        category: 'abstract' as CubeCategory,
        submitForModeration: true,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid visibility value')
    })

    it('should reject invalid category', () => {
      const request = {
        cube: validCube,
        visibility: 'public' as CubeVisibility,
        category: 'invalid' as CubeCategory,
        submitForModeration: true,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid category value')
    })

    it('should reject too many tags', () => {
      const request: CreateCubeRequest = {
        cube: validCube,
        visibility: 'public',
        category: 'abstract',
        tags: Array(15).fill('tag'),
        submitForModeration: true,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Maximum'))).toBe(true)
    })

    it('should reject tags that are too long', () => {
      const request: CreateCubeRequest = {
        cube: validCube,
        visibility: 'public',
        category: 'abstract',
        tags: ['a'.repeat(50)],
        submitForModeration: true,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('exceeds maximum length'))).toBe(true)
    })

    it('should reject public cube without moderation flag', () => {
      const request: CreateCubeRequest = {
        cube: validCube,
        visibility: 'public',
        category: 'abstract',
        submitForModeration: false,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Public cubes must be submitted for moderation')
    })

    it('should allow private cube without moderation flag', () => {
      const request: CreateCubeRequest = {
        cube: validCube,
        visibility: 'private',
        category: 'abstract',
        submitForModeration: false,
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(true)
    })

    it('should reject description that is too long', () => {
      const request: CreateCubeRequest = {
        cube: validCube,
        visibility: 'private',
        category: 'abstract',
        description: 'a'.repeat(1500),
      }

      const result = validateCreateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Description'))).toBe(true)
    })
  })

  describe('validateUpdateCubeRequest', () => {
    it('should validate a valid update request', () => {
      const request: UpdateCubeRequest = {
        category: 'nature',
      }

      const result = validateUpdateCubeRequest(request)
      expect(result.valid).toBe(true)
    })

    it('should reject empty update request', () => {
      const request: UpdateCubeRequest = {}

      const result = validateUpdateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least one field must be provided for update')
    })

    it('should reject invalid visibility in update', () => {
      const request = {
        visibility: 'invalid' as CubeVisibility,
      }

      const result = validateUpdateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid visibility value')
    })

    it('should reject invalid category in update', () => {
      const request = {
        category: 'invalid' as CubeCategory,
      }

      const result = validateUpdateCubeRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid category value')
    })

    it('should validate multiple fields', () => {
      const request: UpdateCubeRequest = {
        visibility: 'unlisted',
        category: 'fantasy',
        tags: ['magic', 'crystal'],
      }

      const result = validateUpdateCubeRequest(request)
      expect(result.valid).toBe(true)
    })
  })

  // ===========================================================================
  // API Response Helper Tests
  // ===========================================================================

  describe('createApiError', () => {
    it('should create an error with all fields', () => {
      const error = createApiError('VALIDATION_ERROR', 'Invalid input', { field: 'name' })

      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Invalid input')
      expect(error.details).toEqual({ field: 'name' })
      expect(error.timestamp).toBeDefined()
    })

    it('should work without details', () => {
      const error = createApiError('SERVER_ERROR', 'Internal error')

      expect(error.code).toBe('SERVER_ERROR')
      expect(error.message).toBe('Internal error')
      expect(error.details).toBeUndefined()
    })
  })

  describe('createApiResponse', () => {
    it('should create a success response', () => {
      const response = createApiResponse({ id: '123', name: 'Test' })

      expect(response.success).toBe(true)
      expect(response.data).toEqual({ id: '123', name: 'Test' })
      expect(response.error).toBeUndefined()
      expect(response.meta).toBeDefined()
      expect(response.meta?.apiVersion).toBe('1.0.0')
    })

    it('should include custom meta', () => {
      const response = createApiResponse({ id: '123' }, { responseTime: 50 })

      expect(response.meta?.responseTime).toBe(50)
    })
  })

  describe('createApiErrorResponse', () => {
    it('should create an error response', () => {
      const error = createApiError('RESOURCE_NOT_FOUND', 'Cube not found')
      const response = createApiErrorResponse(error)

      expect(response.success).toBe(false)
      expect(response.data).toBeUndefined()
      expect(response.error).toBe(error)
    })
  })

  // ===========================================================================
  // Permission Helper Tests
  // ===========================================================================

  describe('canModerate', () => {
    it('should return true for moderator role', () => {
      expect(canModerate('moderator')).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(canModerate('admin')).toBe(true)
    })

    it('should return false for user role', () => {
      expect(canModerate('user')).toBe(false)
    })

    it('should return false for creator role', () => {
      expect(canModerate('creator')).toBe(false)
    })

    it('should return false for undefined role', () => {
      expect(canModerate(undefined)).toBe(false)
    })
  })

  describe('canManageAllCubes', () => {
    it('should return true for admin role', () => {
      expect(canManageAllCubes('admin')).toBe(true)
    })

    it('should return false for moderator role', () => {
      expect(canManageAllCubes('moderator')).toBe(false)
    })

    it('should return false for user role', () => {
      expect(canManageAllCubes('user')).toBe(false)
    })

    it('should return false for undefined role', () => {
      expect(canManageAllCubes(undefined)).toBe(false)
    })
  })

  describe('canUpdateCube', () => {
    const mockCube = {
      id: 'test',
      cube: { id: 'test', base: { color: [0, 0, 0] } } as SpectralCube,
      author: { id: 'owner-123', displayName: 'Owner' },
      status: 'published' as const,
      visibility: 'public' as const,
      category: 'abstract' as const,
      stats: { views: 0, likes: 0, downloads: 0, comments: 0 },
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should return true for owner', () => {
      expect(canUpdateCube(mockCube, 'owner-123')).toBe(true)
    })

    it('should return false for non-owner', () => {
      expect(canUpdateCube(mockCube, 'other-user')).toBe(false)
    })

    it('should return true for admin regardless of ownership', () => {
      expect(canUpdateCube(mockCube, 'other-user', 'admin')).toBe(true)
    })

    it('should return false for undefined user', () => {
      expect(canUpdateCube(mockCube, undefined)).toBe(false)
    })
  })

  describe('canDeleteCube', () => {
    const mockCube = {
      id: 'test',
      cube: { id: 'test', base: { color: [0, 0, 0] } } as SpectralCube,
      author: { id: 'owner-123', displayName: 'Owner' },
      status: 'published' as const,
      visibility: 'public' as const,
      category: 'abstract' as const,
      stats: { views: 0, likes: 0, downloads: 0, comments: 0 },
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should return true for owner', () => {
      expect(canDeleteCube(mockCube, 'owner-123')).toBe(true)
    })

    it('should return false for non-owner', () => {
      expect(canDeleteCube(mockCube, 'other-user')).toBe(false)
    })

    it('should return true for admin regardless of ownership', () => {
      expect(canDeleteCube(mockCube, 'other-user', 'admin')).toBe(true)
    })
  })

  // ===========================================================================
  // Constants Tests
  // ===========================================================================

  describe('API_CONSTANTS', () => {
    it('should have reasonable max page size', () => {
      expect(API_CONSTANTS.MAX_PAGE_SIZE).toBeGreaterThanOrEqual(50)
      expect(API_CONSTANTS.MAX_PAGE_SIZE).toBeLessThanOrEqual(1000)
    })

    it('should have reasonable default page size', () => {
      expect(API_CONSTANTS.DEFAULT_PAGE_SIZE).toBeGreaterThan(0)
      expect(API_CONSTANTS.DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(API_CONSTANTS.MAX_PAGE_SIZE)
    })

    it('should have reasonable tag limits', () => {
      expect(API_CONSTANTS.MAX_TAGS_PER_CUBE).toBeGreaterThan(0)
      expect(API_CONSTANTS.MAX_TAG_LENGTH).toBeGreaterThan(0)
    })

    it('should have auto-moderation threshold between 0 and 1', () => {
      expect(API_CONSTANTS.AUTO_MODERATION_THRESHOLD).toBeGreaterThan(0)
      expect(API_CONSTANTS.AUTO_MODERATION_THRESHOLD).toBeLessThanOrEqual(1)
    })

    it('should have flag threshold for auto-hiding', () => {
      expect(API_CONSTANTS.AUTO_HIDE_FLAG_THRESHOLD).toBeGreaterThan(0)
    })
  })

  describe('PUBLISHING_API_STORAGE_KEYS', () => {
    it('should have all required storage keys', () => {
      expect(PUBLISHING_API_STORAGE_KEYS.PUBLISHED_CUBES).toBeDefined()
      expect(PUBLISHING_API_STORAGE_KEYS.MODERATION_RECORDS).toBeDefined()
      expect(PUBLISHING_API_STORAGE_KEYS.CONTENT_FLAGS).toBeDefined()
      expect(PUBLISHING_API_STORAGE_KEYS.RATE_LIMIT_STATE).toBeDefined()
    })

    it('should have unique storage keys', () => {
      const keys = Object.values(PUBLISHING_API_STORAGE_KEYS)
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(keys.length)
    })

    it('should have consistent prefix', () => {
      Object.values(PUBLISHING_API_STORAGE_KEYS).forEach((key) => {
        expect(key.startsWith('isocubic_api_')).toBe(true)
      })
    })
  })
})

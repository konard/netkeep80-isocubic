/**
 * TypeScript types for Publishing REST API (TASK 48)
 * Defines types for server-side API operations including CRUD, moderation, and rate limiting
 *
 * This module provides types for:
 * - REST API request/response types
 * - CRUD operations for published cubes
 * - Content moderation system
 * - Rate limiting and protection
 * - API error handling
 *
 * Backend decision: Supabase was chosen because:
 * - Consistent with auth system (TASK 44)
 * - PostgreSQL for reliable data storage
 * - Built-in Row Level Security (RLS)
 * - RESTful API auto-generation from schema
 * - Real-time subscriptions for live updates
 */

import type { SpectralCube } from './cube'
import type {
  PublishedCube,
  CubeCategory,
  CubeVisibility,
  PaginationMeta,
  CommunitySortOption,
} from './community'
import type { UserRole } from './auth'

// ============================================================================
// HTTP and API Types
// ============================================================================

/**
 * HTTP method types for REST API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Standard HTTP status codes used by the API
 */
export type HttpStatusCode =
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 503 // Service Unavailable

/**
 * API error codes for specific error handling
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTENT_MODERATION_FAILED'
  | 'CONTENT_FLAGGED'
  | 'INVALID_REQUEST'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'

/**
 * Standard API error response
 */
export interface ApiError {
  /** Error code for programmatic handling */
  code: ApiErrorCode
  /** Human-readable error message */
  message: string
  /** Additional error details (e.g., field-specific validation errors) */
  details?: Record<string, string | string[]>
  /** Request ID for debugging/support */
  requestId?: string
  /** Timestamp of the error (ISO 8601) */
  timestamp: string
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean
  /** Response data (present if success is true) */
  data?: T
  /** Error information (present if success is false) */
  error?: ApiError
  /** Response metadata */
  meta?: ResponseMeta
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  /** Request ID for tracing */
  requestId: string
  /** Response time in milliseconds */
  responseTime: number
  /** API version */
  apiVersion: string
}

// ============================================================================
// CRUD Request Types
// ============================================================================

/**
 * Request to create/publish a new cube
 */
export interface CreateCubeRequest {
  /** The cube configuration to publish */
  cube: SpectralCube
  /** Initial visibility level */
  visibility: CubeVisibility
  /** Category for organization */
  category: CubeCategory
  /** Optional tags for discoverability */
  tags?: string[]
  /** Optional description */
  description?: string
  /** Whether to submit for moderation (required for 'public' visibility) */
  submitForModeration?: boolean
}

/**
 * Request to update an existing published cube
 */
export interface UpdateCubeRequest {
  /** Updated cube configuration (partial update supported) */
  cube?: Partial<SpectralCube>
  /** Updated visibility level */
  visibility?: CubeVisibility
  /** Updated category */
  category?: CubeCategory
  /** Updated tags (replaces existing) */
  tags?: string[]
  /** Updated description */
  description?: string
}

/**
 * Request to update cube metadata only (not the cube config)
 */
export interface UpdateCubeMetadataRequest {
  /** Updated visibility level */
  visibility?: CubeVisibility
  /** Updated category */
  category?: CubeCategory
  /** Updated tags (replaces existing) */
  tags?: string[]
  /** Updated description */
  description?: string
}

/**
 * Query parameters for listing/searching cubes
 */
export interface ListCubesQuery {
  /** Text search query */
  query?: string
  /** Filter by category */
  category?: CubeCategory | 'all'
  /** Filter by visibility (admin/owner only) */
  visibility?: CubeVisibility
  /** Filter by author ID */
  authorId?: string
  /** Filter by moderation status (admin only) */
  moderationStatus?: ModerationStatus
  /** Sort option */
  sortBy?: CommunitySortOption
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Page number (1-indexed) */
  page?: number
  /** Items per page (default 20, max 100) */
  pageSize?: number
  /** Filter by tags */
  tags?: string[]
  /** Include only featured cubes */
  featured?: boolean
  /** Include only staff picks */
  staffPicks?: boolean
}

/**
 * Query parameters for getting a single cube
 */
export interface GetCubeQuery {
  /** Whether to increment view count */
  trackView?: boolean
  /** Whether to include related cubes */
  includeRelated?: boolean
}

// ============================================================================
// CRUD Response Types
// ============================================================================

/**
 * Response for creating a cube
 */
export interface CreateCubeResponse {
  /** The created published cube */
  cube: PublishedCube
  /** Moderation status if submitted for review */
  moderationStatus?: ModerationStatus
  /** Estimated moderation time (if pending) */
  estimatedModerationTime?: string
}

/**
 * Response for updating a cube
 */
export interface UpdateCubeResponse {
  /** The updated published cube */
  cube: PublishedCube
  /** Whether moderation is required after update */
  moderationRequired: boolean
}

/**
 * Response for listing cubes
 */
export interface ListCubesResponse {
  /** Array of published cubes */
  cubes: PublishedCube[]
  /** Pagination metadata */
  pagination: PaginationMeta
  /** Applied filters summary */
  appliedFilters: ListCubesQuery
}

/**
 * Response for getting a single cube
 */
export interface GetCubeResponse {
  /** The requested cube */
  cube: PublishedCube
  /** Related cubes (if requested) */
  relatedCubes?: PublishedCube[]
  /** Author's other cubes */
  authorCubes?: PublishedCube[]
}

/**
 * Response for deleting a cube
 */
export interface DeleteCubeResponse {
  /** ID of the deleted cube */
  deletedId: string
  /** Deletion timestamp */
  deletedAt: string
}

// ============================================================================
// Moderation Types
// ============================================================================

/**
 * Content moderation status
 */
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'auto_approved'

/**
 * Moderation rejection reasons
 */
export type ModerationRejectionReason =
  | 'inappropriate_content'
  | 'copyright_violation'
  | 'spam'
  | 'low_quality'
  | 'offensive_name'
  | 'other'

/**
 * Content flag types for user reports
 */
export type ContentFlagType = 'inappropriate' | 'copyright' | 'spam' | 'offensive' | 'other'

/**
 * Moderation action types
 */
export type ModerationAction = 'approve' | 'reject' | 'flag_for_review' | 'escalate' | 'unflag'

/**
 * Moderation record for a cube
 */
export interface ModerationRecord {
  /** Moderation record ID */
  id: string
  /** Cube ID being moderated */
  cubeId: string
  /** Current moderation status */
  status: ModerationStatus
  /** Moderator user ID (if manually moderated) */
  moderatorId?: string
  /** Rejection reason (if rejected) */
  rejectionReason?: ModerationRejectionReason
  /** Additional notes from moderator */
  moderatorNotes?: string
  /** Auto-moderation confidence score (0-1) */
  autoModerationScore?: number
  /** Flags from auto-moderation */
  autoModerationFlags?: string[]
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** History of moderation actions */
  history: ModerationHistoryEntry[]
}

/**
 * Entry in moderation history
 */
export interface ModerationHistoryEntry {
  /** Action taken */
  action: ModerationAction
  /** Who performed the action */
  performedBy: string
  /** Previous status */
  previousStatus: ModerationStatus
  /** New status */
  newStatus: ModerationStatus
  /** Reason for action */
  reason?: string
  /** Timestamp */
  timestamp: string
}

/**
 * Request to moderate a cube (admin/moderator only)
 */
export interface ModerateCubeRequest {
  /** Action to perform */
  action: ModerationAction
  /** Reason for rejection (required if action is 'reject') */
  rejectionReason?: ModerationRejectionReason
  /** Additional notes */
  notes?: string
}

/**
 * User report for content flagging
 */
export interface ContentFlagRequest {
  /** Type of flag/report */
  flagType: ContentFlagType
  /** Description of the issue */
  description?: string
}

/**
 * Response for flagging content
 */
export interface ContentFlagResponse {
  /** Flag record ID */
  flagId: string
  /** Acknowledgment message */
  message: string
  /** Whether the content was auto-hidden */
  autoHidden: boolean
}

/**
 * Moderation queue item
 */
export interface ModerationQueueItem {
  /** The cube pending moderation */
  cube: PublishedCube
  /** Current moderation record */
  moderation: ModerationRecord
  /** Number of user flags */
  flagCount: number
  /** Priority score (higher = more urgent) */
  priority: number
  /** Time in queue */
  timeInQueue: string
}

/**
 * Moderation queue response
 */
export interface ModerationQueueResponse {
  /** Items in the queue */
  items: ModerationQueueItem[]
  /** Queue statistics */
  stats: ModerationQueueStats
  /** Pagination */
  pagination: PaginationMeta
}

/**
 * Moderation queue statistics
 */
export interface ModerationQueueStats {
  /** Total items pending */
  totalPending: number
  /** Items pending > 24 hours */
  overdue: number
  /** Items flagged by users */
  flagged: number
  /** Average review time (minutes) */
  averageReviewTime: number
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number
  /** Window duration in seconds */
  windowSeconds: number
  /** Whether to use sliding window */
  slidingWindow: boolean
}

/**
 * Rate limit status returned in headers
 */
export interface RateLimitStatus {
  /** Maximum requests allowed in the window */
  limit: number
  /** Remaining requests in current window */
  remaining: number
  /** Timestamp when the window resets (Unix seconds) */
  reset: number
  /** Retry-After header value (seconds until can retry) */
  retryAfter?: number
}

/**
 * Rate limit tiers based on user role/plan
 */
export type RateLimitTier = 'anonymous' | 'authenticated' | 'creator' | 'premium' | 'admin'

/**
 * Rate limit configuration per tier
 */
export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  anonymous: { maxRequests: 30, windowSeconds: 60, slidingWindow: true },
  authenticated: { maxRequests: 100, windowSeconds: 60, slidingWindow: true },
  creator: { maxRequests: 200, windowSeconds: 60, slidingWindow: true },
  premium: { maxRequests: 500, windowSeconds: 60, slidingWindow: true },
  admin: { maxRequests: 1000, windowSeconds: 60, slidingWindow: true },
}

/**
 * Endpoint-specific rate limits
 */
export interface EndpointRateLimit {
  /** Endpoint path pattern */
  path: string
  /** HTTP method */
  method: HttpMethod
  /** Rate limit configuration */
  config: RateLimitConfig
  /** Description of the limit */
  description: string
}

/**
 * Endpoint-specific rate limits for publishing operations
 */
export const ENDPOINT_RATE_LIMITS: EndpointRateLimit[] = [
  {
    path: '/api/cubes',
    method: 'POST',
    config: { maxRequests: 10, windowSeconds: 3600, slidingWindow: true },
    description: 'Publish new cube (10 per hour)',
  },
  {
    path: '/api/cubes/:id',
    method: 'PUT',
    config: { maxRequests: 30, windowSeconds: 3600, slidingWindow: true },
    description: 'Update cube (30 per hour)',
  },
  {
    path: '/api/cubes/:id',
    method: 'DELETE',
    config: { maxRequests: 20, windowSeconds: 3600, slidingWindow: true },
    description: 'Delete cube (20 per hour)',
  },
  {
    path: '/api/cubes/:id/flag',
    method: 'POST',
    config: { maxRequests: 10, windowSeconds: 86400, slidingWindow: false },
    description: 'Flag content (10 per day)',
  },
]

// ============================================================================
// API Client Types
// ============================================================================

/**
 * API client configuration
 */
export interface ApiClientConfig {
  /** Base URL for the API */
  baseUrl: string
  /** Default timeout in milliseconds */
  timeout: number
  /** Maximum number of retries */
  maxRetries: number
  /** Retry delay base in milliseconds */
  retryDelayBase: number
  /** Whether to include credentials */
  withCredentials: boolean
}

/**
 * Default API client configuration
 */
export const DEFAULT_API_CLIENT_CONFIG: ApiClientConfig = {
  baseUrl: '/api',
  timeout: 30000,
  maxRetries: 3,
  retryDelayBase: 1000,
  withCredentials: true,
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  /** Custom headers */
  headers?: Record<string, string>
  /** Request timeout override */
  timeout?: number
  /** Skip authentication */
  skipAuth?: boolean
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch operation for multiple cubes
 */
export interface BatchCubeOperation {
  /** Cube ID */
  cubeId: string
  /** Operation to perform */
  operation: 'update' | 'delete' | 'moderate'
  /** Operation data (specific to operation type) */
  data?: UpdateCubeRequest | ModerateCubeRequest
}

/**
 * Batch operation request
 */
export interface BatchOperationRequest {
  /** Array of operations to perform */
  operations: BatchCubeOperation[]
  /** Whether to stop on first error */
  stopOnError: boolean
}

/**
 * Result of a single batch operation
 */
export interface BatchOperationResultItem {
  /** Cube ID */
  cubeId: string
  /** Whether operation succeeded */
  success: boolean
  /** Error if failed */
  error?: string
}

/**
 * Batch operation response
 */
export interface BatchOperationResponse {
  /** Results for each operation */
  results: BatchOperationResultItem[]
  /** Number of successful operations */
  successCount: number
  /** Number of failed operations */
  failCount: number
  /** Total time taken (milliseconds) */
  totalTime: number
}

// ============================================================================
// Storage Keys and Constants
// ============================================================================

/**
 * Storage keys for publishing API
 */
export const PUBLISHING_API_STORAGE_KEYS = {
  PUBLISHED_CUBES: 'isocubic_api_published_cubes',
  MODERATION_RECORDS: 'isocubic_api_moderation_records',
  CONTENT_FLAGS: 'isocubic_api_content_flags',
  RATE_LIMIT_STATE: 'isocubic_api_rate_limit_state',
} as const

/**
 * API configuration constants
 */
export const API_CONSTANTS = {
  /** Maximum page size for listings */
  MAX_PAGE_SIZE: 100,
  /** Default page size */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum tags per cube */
  MAX_TAGS_PER_CUBE: 10,
  /** Maximum tag length */
  MAX_TAG_LENGTH: 30,
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 1000,
  /** Auto-moderation threshold (above this = auto-approve) */
  AUTO_MODERATION_THRESHOLD: 0.95,
  /** Flag threshold for auto-hiding */
  AUTO_HIDE_FLAG_THRESHOLD: 5,
} as const

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates API error code
 */
export function isValidApiErrorCode(code: string): code is ApiErrorCode {
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
  return validCodes.includes(code as ApiErrorCode)
}

/**
 * Validates moderation status
 */
export function isValidModerationStatus(status: string): status is ModerationStatus {
  const validStatuses: ModerationStatus[] = [
    'pending',
    'approved',
    'rejected',
    'flagged',
    'auto_approved',
  ]
  return validStatuses.includes(status as ModerationStatus)
}

/**
 * Validates content flag type
 */
export function isValidContentFlagType(type: string): type is ContentFlagType {
  const validTypes: ContentFlagType[] = ['inappropriate', 'copyright', 'spam', 'offensive', 'other']
  return validTypes.includes(type as ContentFlagType)
}

/**
 * Gets rate limit tier from user role
 */
export function getRateLimitTierFromRole(role?: UserRole): RateLimitTier {
  if (!role) return 'anonymous'
  switch (role) {
    case 'admin':
      return 'admin'
    case 'moderator':
      return 'admin'
    case 'creator':
      return 'creator'
    case 'user':
      return 'authenticated'
    default:
      return 'authenticated'
  }
}

/**
 * Validates create cube request
 */
export function validateCreateCubeRequest(request: CreateCubeRequest): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate cube
  if (!request.cube) {
    errors.push('Cube configuration is required')
  } else {
    if (!request.cube.id) {
      errors.push('Cube ID is required')
    }
    if (!request.cube.base?.color || !Array.isArray(request.cube.base.color)) {
      errors.push('Cube base color is required')
    }
  }

  // Validate visibility
  const validVisibilities: CubeVisibility[] = ['public', 'unlisted', 'private']
  if (!validVisibilities.includes(request.visibility)) {
    errors.push('Invalid visibility value')
  }

  // Validate category
  const validCategories: CubeCategory[] = [
    'nature',
    'building',
    'fantasy',
    'industrial',
    'organic',
    'abstract',
    'other',
  ]
  if (!validCategories.includes(request.category)) {
    errors.push('Invalid category value')
  }

  // Validate tags
  if (request.tags) {
    if (request.tags.length > API_CONSTANTS.MAX_TAGS_PER_CUBE) {
      errors.push(`Maximum ${API_CONSTANTS.MAX_TAGS_PER_CUBE} tags allowed`)
    }
    request.tags.forEach((tag, index) => {
      if (tag.length > API_CONSTANTS.MAX_TAG_LENGTH) {
        errors.push(`Tag ${index + 1} exceeds maximum length of ${API_CONSTANTS.MAX_TAG_LENGTH}`)
      }
    })
  }

  // Validate description
  if (request.description && request.description.length > API_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description exceeds maximum length of ${API_CONSTANTS.MAX_DESCRIPTION_LENGTH}`)
  }

  // Public visibility requires moderation
  if (request.visibility === 'public' && !request.submitForModeration) {
    errors.push('Public cubes must be submitted for moderation')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates update cube request
 */
export function validateUpdateCubeRequest(request: UpdateCubeRequest): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // At least one field must be present
  if (
    !request.cube &&
    !request.visibility &&
    !request.category &&
    !request.tags &&
    request.description === undefined
  ) {
    errors.push('At least one field must be provided for update')
  }

  // Validate visibility if present
  if (request.visibility) {
    const validVisibilities: CubeVisibility[] = ['public', 'unlisted', 'private']
    if (!validVisibilities.includes(request.visibility)) {
      errors.push('Invalid visibility value')
    }
  }

  // Validate category if present
  if (request.category) {
    const validCategories: CubeCategory[] = [
      'nature',
      'building',
      'fantasy',
      'industrial',
      'organic',
      'abstract',
      'other',
    ]
    if (!validCategories.includes(request.category)) {
      errors.push('Invalid category value')
    }
  }

  // Validate tags if present
  if (request.tags) {
    if (request.tags.length > API_CONSTANTS.MAX_TAGS_PER_CUBE) {
      errors.push(`Maximum ${API_CONSTANTS.MAX_TAGS_PER_CUBE} tags allowed`)
    }
    request.tags.forEach((tag, index) => {
      if (tag.length > API_CONSTANTS.MAX_TAG_LENGTH) {
        errors.push(`Tag ${index + 1} exceeds maximum length of ${API_CONSTANTS.MAX_TAG_LENGTH}`)
      }
    })
  }

  // Validate description if present
  if (request.description && request.description.length > API_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description exceeds maximum length of ${API_CONSTANTS.MAX_DESCRIPTION_LENGTH}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Creates an API error response
 */
export function createApiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, string | string[]>
): ApiError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Creates a success API response
 */
export function createApiResponse<T>(data: T, meta?: Partial<ResponseMeta>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: meta?.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responseTime: meta?.responseTime || 0,
      apiVersion: meta?.apiVersion || '1.0.0',
    },
  }
}

/**
 * Creates an error API response
 */
export function createApiErrorResponse(error: ApiError): ApiResponse<never> {
  return {
    success: false,
    error,
  }
}

/**
 * Checks if user has permission for moderation actions
 */
export function canModerate(role?: UserRole): boolean {
  return role === 'moderator' || role === 'admin'
}

/**
 * Checks if user can manage all cubes (admin only)
 */
export function canManageAllCubes(role?: UserRole): boolean {
  return role === 'admin'
}

/**
 * Checks if user can update a specific cube
 */
export function canUpdateCube(cube: PublishedCube, userId?: string, role?: UserRole): boolean {
  if (canManageAllCubes(role)) return true
  return cube.author.id === userId
}

/**
 * Checks if user can delete a specific cube
 */
export function canDeleteCube(cube: PublishedCube, userId?: string, role?: UserRole): boolean {
  if (canManageAllCubes(role)) return true
  return cube.author.id === userId
}

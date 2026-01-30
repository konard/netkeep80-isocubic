/**
 * Publishing REST API Service (TASK 48)
 * Provides server-side API operations for cube publishing, CRUD, moderation, and rate limiting
 *
 * Current implementation: Mock service with in-memory data and localStorage persistence
 * Future: Replace with real Supabase API calls
 *
 * Features:
 * - Full CRUD operations for published cubes
 * - Content moderation system (auto + manual)
 * - Rate limiting per endpoint and user tier
 * - Batch operations support
 * - Content flagging for user reports
 */

import type { SpectralCube } from '../types/cube'
import type { UserProfile, UserRole } from '../types/auth'
import type { PublishedCube, PaginationMeta, CommunitySortOption } from '../types/community'
import { DEFAULT_CUBE_STATS } from '../types/community'
import type {
  ApiResponse,
  CreateCubeRequest,
  CreateCubeResponse,
  UpdateCubeRequest,
  UpdateCubeResponse,
  ListCubesQuery,
  ListCubesResponse,
  GetCubeQuery,
  GetCubeResponse,
  DeleteCubeResponse,
  ModerationStatus,
  ModerationRecord,
  ModerationHistoryEntry,
  ModerateCubeRequest,
  ContentFlagRequest,
  ContentFlagResponse,
  ModerationQueueItem,
  ModerationQueueResponse,
  ModerationQueueStats,
  RateLimitStatus,
  RateLimitTier,
  BatchOperationRequest,
  BatchOperationResponse,
  BatchOperationResultItem,
} from '../types/publishing-api'
import {
  PUBLISHING_API_STORAGE_KEYS,
  API_CONSTANTS,
  RATE_LIMIT_TIERS,
  ENDPOINT_RATE_LIMITS,
  validateCreateCubeRequest,
  validateUpdateCubeRequest,
  createApiError,
  createApiResponse,
  createApiErrorResponse,
  getRateLimitTierFromRole,
  canModerate,
  canManageAllCubes,
  canUpdateCube,
  canDeleteCube,
} from '../types/publishing-api'

// ============================================================================
// In-Memory Mock Database
// ============================================================================

/** Published cubes database */
let publishedCubesDb: PublishedCube[] = []

/** Moderation records database */
let moderationRecordsDb: Map<string, ModerationRecord> = new Map()

/** Content flags database */
interface ContentFlag {
  id: string
  cubeId: string
  userId: string
  flagType: string
  description?: string
  createdAt: string
  reviewed: boolean
}
let contentFlagsDb: ContentFlag[] = []

/** Rate limit state (user ID -> endpoint -> request timestamps) */
let rateLimitState: Map<string, Map<string, number[]>> = new Map()

// ============================================================================
// Storage Persistence
// ============================================================================

/**
 * Loads published cubes from localStorage
 */
function loadPublishedCubes(): void {
  try {
    const stored = localStorage.getItem(PUBLISHING_API_STORAGE_KEYS.PUBLISHED_CUBES)
    if (stored) {
      publishedCubesDb = JSON.parse(stored)
    }
  } catch {
    publishedCubesDb = []
  }
}

/**
 * Saves published cubes to localStorage
 */
function savePublishedCubes(): void {
  try {
    localStorage.setItem(
      PUBLISHING_API_STORAGE_KEYS.PUBLISHED_CUBES,
      JSON.stringify(publishedCubesDb)
    )
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

/**
 * Loads moderation records from localStorage
 */
function loadModerationRecords(): void {
  try {
    const stored = localStorage.getItem(PUBLISHING_API_STORAGE_KEYS.MODERATION_RECORDS)
    if (stored) {
      const parsed = JSON.parse(stored) as [string, ModerationRecord][]
      moderationRecordsDb = new Map(parsed)
    }
  } catch {
    moderationRecordsDb = new Map()
  }
}

/**
 * Saves moderation records to localStorage
 */
function saveModerationRecords(): void {
  try {
    localStorage.setItem(
      PUBLISHING_API_STORAGE_KEYS.MODERATION_RECORDS,
      JSON.stringify(Array.from(moderationRecordsDb.entries()))
    )
  } catch {
    // Ignore storage errors
  }
}

/**
 * Loads content flags from localStorage
 */
function loadContentFlags(): void {
  try {
    const stored = localStorage.getItem(PUBLISHING_API_STORAGE_KEYS.CONTENT_FLAGS)
    if (stored) {
      contentFlagsDb = JSON.parse(stored)
    }
  } catch {
    contentFlagsDb = []
  }
}

/**
 * Saves content flags to localStorage
 */
function saveContentFlags(): void {
  try {
    localStorage.setItem(PUBLISHING_API_STORAGE_KEYS.CONTENT_FLAGS, JSON.stringify(contentFlagsDb))
  } catch {
    // Ignore storage errors
  }
}

// Initialize from storage
loadPublishedCubes()
loadModerationRecords()
loadContentFlags()

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simulates network delay for realistic async behavior
 */
async function simulateNetworkDelay(ms: number = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generates a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Gets the current timestamp in ISO format
 */
function now(): string {
  return new Date().toISOString()
}

/**
 * Paginates an array of items
 */
function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; meta: PaginationMeta } {
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const currentPage = Math.max(1, Math.min(page, totalPages))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize

  return {
    items: items.slice(startIndex, endIndex),
    meta: {
      currentPage,
      totalPages,
      totalItems,
      pageSize,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
  }
}

/**
 * Filters cubes based on query parameters
 */
function filterCubes(cubes: PublishedCube[], query: ListCubesQuery): PublishedCube[] {
  return cubes.filter((cube) => {
    // Text search
    if (query.query) {
      const searchQuery = query.query.toLowerCase()
      const name = cube.cube.meta?.name?.toLowerCase() || ''
      const prompt = cube.cube.prompt?.toLowerCase() || ''
      const tags = cube.cube.meta?.tags?.map((t) => t.toLowerCase()) || []
      const author = cube.author.displayName.toLowerCase()

      const matches =
        name.includes(searchQuery) ||
        prompt.includes(searchQuery) ||
        tags.some((t) => t.includes(searchQuery)) ||
        author.includes(searchQuery)

      if (!matches) return false
    }

    // Category filter
    if (query.category && query.category !== 'all' && cube.category !== query.category) {
      return false
    }

    // Visibility filter
    if (query.visibility && cube.visibility !== query.visibility) {
      return false
    }

    // Author filter
    if (query.authorId && cube.author.id !== query.authorId) {
      return false
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      const cubeTags = cube.cube.meta?.tags || []
      const hasMatchingTag = query.tags.some((tag) =>
        cubeTags.some((cubeTag) => cubeTag.toLowerCase() === tag.toLowerCase())
      )
      if (!hasMatchingTag) return false
    }

    // Featured filter
    if (query.featured && !cube.isFeatured) {
      return false
    }

    // Staff picks filter
    if (query.staffPicks && !cube.isStaffPick) {
      return false
    }

    return true
  })
}

/**
 * Sorts cubes based on sort option
 */
function sortCubes(
  cubes: PublishedCube[],
  sortBy: CommunitySortOption = 'recent',
  sortDirection: 'asc' | 'desc' = 'desc'
): PublishedCube[] {
  const sorted = [...cubes]
  const multiplier = sortDirection === 'desc' ? -1 : 1

  sorted.sort((a, b) => {
    let comparison: number
    switch (sortBy) {
      case 'recent':
        comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
        break
      case 'popular':
        comparison = a.stats.likes - b.stats.likes
        break
      case 'trending': {
        const ageA = (Date.now() - new Date(a.publishedAt).getTime()) / (24 * 60 * 60 * 1000) + 1
        const ageB = (Date.now() - new Date(b.publishedAt).getTime()) / (24 * 60 * 60 * 1000) + 1
        comparison = a.stats.likes / ageA - b.stats.likes / ageB
        break
      }
      case 'downloads':
        comparison = a.stats.downloads - b.stats.downloads
        break
      case 'views':
        comparison = a.stats.views - b.stats.views
        break
      case 'alphabetical': {
        const nameA = a.cube.meta?.name || a.cube.id
        const nameB = b.cube.meta?.name || b.cube.id
        comparison = nameA.localeCompare(nameB)
        break
      }
      default:
        comparison = 0
    }
    return comparison * multiplier
  })

  return sorted
}

/**
 * Performs auto-moderation on a cube
 * Returns a score from 0-1 (1 = safe, 0 = unsafe)
 */
function autoModerateCube(cube: SpectralCube): { score: number; flags: string[] } {
  const flags: string[] = []

  // Check for suspicious patterns in name
  const name = cube.meta?.name?.toLowerCase() || ''
  const suspiciousPatterns = ['spam', 'xxx', 'hack', 'free money']
  if (suspiciousPatterns.some((pattern) => name.includes(pattern))) {
    flags.push('suspicious_name')
  }

  // Check for empty or minimal content
  if (!cube.base?.color || !Array.isArray(cube.base.color)) {
    flags.push('missing_base_color')
  }

  // Check for extremely simple cubes (potential spam)
  if (!cube.gradients?.length && !cube.noise) {
    flags.push('minimal_content')
  }

  // Calculate score based on flags
  const score = Math.max(0, 1 - flags.length * 0.2)

  return { score, flags }
}

/**
 * Creates a moderation record for a cube
 */
function createModerationRecord(
  cubeId: string,
  autoModeration: { score: number; flags: string[] }
): ModerationRecord {
  const status: ModerationStatus =
    autoModeration.score >= API_CONSTANTS.AUTO_MODERATION_THRESHOLD ? 'auto_approved' : 'pending'

  const record: ModerationRecord = {
    id: generateId('mod'),
    cubeId,
    status,
    autoModerationScore: autoModeration.score,
    autoModerationFlags: autoModeration.flags,
    createdAt: now(),
    updatedAt: now(),
    history: [
      {
        action: status === 'auto_approved' ? 'approve' : 'flag_for_review',
        performedBy: 'system',
        previousStatus: 'pending',
        newStatus: status,
        reason:
          status === 'auto_approved'
            ? 'Auto-approved by moderation system'
            : 'Flagged for manual review',
        timestamp: now(),
      },
    ],
  }

  return record
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Checks rate limit for a user and endpoint
 */
function checkRateLimit(
  userId: string,
  endpoint: string,
  tier: RateLimitTier
): { allowed: boolean; status: RateLimitStatus } {
  const tierConfig = RATE_LIMIT_TIERS[tier]
  const endpointConfig = ENDPOINT_RATE_LIMITS.find((e) =>
    endpoint.includes(e.path.replace(':id', ''))
  )
  const config = endpointConfig?.config || tierConfig

  // Get or create user's rate limit state
  if (!rateLimitState.has(userId)) {
    rateLimitState.set(userId, new Map())
  }
  const userState = rateLimitState.get(userId)!

  // Get or create endpoint's request timestamps
  if (!userState.has(endpoint)) {
    userState.set(endpoint, [])
  }
  const timestamps = userState.get(endpoint)!

  const currentTime = Date.now()
  const windowStart = currentTime - config.windowSeconds * 1000

  // Clean up old timestamps
  const validTimestamps = timestamps.filter((ts) => ts > windowStart)
  userState.set(endpoint, validTimestamps)

  // Check if rate limit exceeded
  const remaining = Math.max(0, config.maxRequests - validTimestamps.length)
  const resetTime = Math.ceil((windowStart + config.windowSeconds * 1000) / 1000)

  const status: RateLimitStatus = {
    limit: config.maxRequests,
    remaining,
    reset: resetTime,
  }

  if (remaining === 0) {
    status.retryAfter = Math.ceil(
      (validTimestamps[0] + config.windowSeconds * 1000 - currentTime) / 1000
    )
    return { allowed: false, status }
  }

  // Record this request
  validTimestamps.push(currentTime)
  userState.set(endpoint, validTimestamps)

  return { allowed: true, status }
}

// ============================================================================
// Publishing API Service
// ============================================================================

/**
 * Publishing API Service
 * Provides CRUD operations, moderation, and rate limiting for published cubes
 */
export const publishingApiService = {
  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Creates (publishes) a new cube
   */
  async createCube(
    request: CreateCubeRequest,
    author: UserProfile
  ): Promise<ApiResponse<CreateCubeResponse>> {
    await simulateNetworkDelay(300)

    // Rate limit check
    const rateLimitTier = getRateLimitTierFromRole(author.role)
    const rateLimit = checkRateLimit(author.id, '/api/cubes', rateLimitTier)
    if (!rateLimit.allowed) {
      return createApiErrorResponse(
        createApiError(
          'RATE_LIMIT_EXCEEDED',
          'Too many publish requests. Please try again later.',
          {
            retryAfter: String(rateLimit.status.retryAfter),
          }
        )
      )
    }

    // Validate request
    const validation = validateCreateCubeRequest(request)
    if (!validation.valid) {
      return createApiErrorResponse(
        createApiError('VALIDATION_ERROR', 'Invalid cube data', {
          fields: validation.errors,
        })
      )
    }

    // Perform auto-moderation
    const autoModeration = autoModerateCube(request.cube)

    // Determine initial status
    let status: 'published' | 'draft' | 'under_review' = 'draft'
    let moderationStatus: ModerationStatus = 'pending'

    if (request.visibility === 'public') {
      if (autoModeration.score >= API_CONSTANTS.AUTO_MODERATION_THRESHOLD) {
        status = 'published'
        moderationStatus = 'auto_approved'
      } else {
        status = 'under_review'
        moderationStatus = 'pending'
      }
    } else if (request.visibility === 'unlisted') {
      status = 'published'
      moderationStatus = 'auto_approved'
    } else {
      status = 'draft'
      moderationStatus = 'auto_approved'
    }

    // Create the published cube
    const cubeId = generateId('pub')
    const timestamp = now()

    const publishedCube: PublishedCube = {
      id: cubeId,
      cube: {
        ...request.cube,
        meta: {
          ...request.cube.meta,
          tags: request.tags || request.cube.meta?.tags || [],
        },
      },
      author: {
        id: author.id,
        displayName: author.displayName,
        avatarUrl: author.avatarUrl,
      },
      status,
      visibility: request.visibility,
      category: request.category,
      stats: { ...DEFAULT_CUBE_STATS },
      isLiked: false,
      publishedAt: timestamp,
      updatedAt: timestamp,
      isFeatured: false,
      isStaffPick: false,
    }

    // Create moderation record
    const moderationRecord = createModerationRecord(cubeId, autoModeration)
    moderationRecord.status = moderationStatus

    // Store in database
    publishedCubesDb.unshift(publishedCube)
    moderationRecordsDb.set(cubeId, moderationRecord)

    // Persist to storage
    savePublishedCubes()
    saveModerationRecords()

    const response: CreateCubeResponse = {
      cube: publishedCube,
      moderationStatus,
    }

    if (moderationStatus === 'pending') {
      response.estimatedModerationTime = '24 hours'
    }

    return createApiResponse(response)
  },

  /**
   * Gets a single cube by ID
   */
  async getCube(
    id: string,
    query: GetCubeQuery = {},
    userId?: string
  ): Promise<ApiResponse<GetCubeResponse>> {
    await simulateNetworkDelay(100)

    const cube = publishedCubesDb.find((c) => c.id === id)
    if (!cube) {
      return createApiErrorResponse(
        createApiError('RESOURCE_NOT_FOUND', `Cube with ID '${id}' not found`)
      )
    }

    // Check visibility permissions
    if (cube.visibility === 'private' && cube.author.id !== userId) {
      return createApiErrorResponse(createApiError('PERMISSION_DENIED', 'This cube is private'))
    }

    // Increment view count if requested
    if (query.trackView !== false) {
      cube.stats.views += 1
      savePublishedCubes()
    }

    const response: GetCubeResponse = {
      cube,
    }

    // Include related cubes if requested
    if (query.includeRelated) {
      const relatedCubes = publishedCubesDb
        .filter((c) => c.id !== id && c.visibility === 'public' && c.category === cube.category)
        .slice(0, 6)
      response.relatedCubes = relatedCubes

      const authorCubes = publishedCubesDb
        .filter(
          (c) =>
            c.id !== id &&
            c.author.id === cube.author.id &&
            (c.visibility === 'public' || c.author.id === userId)
        )
        .slice(0, 6)
      response.authorCubes = authorCubes
    }

    return createApiResponse(response)
  },

  /**
   * Lists cubes with filtering, sorting, and pagination
   */
  async listCubes(
    query: ListCubesQuery,
    userId?: string,
    userRole?: UserRole
  ): Promise<ApiResponse<ListCubesResponse>> {
    await simulateNetworkDelay(200)

    // Start with all cubes
    let cubes = [...publishedCubesDb]

    // Filter by visibility (only show public unless owner or admin)
    if (!canManageAllCubes(userRole)) {
      cubes = cubes.filter(
        (c) => c.visibility === 'public' || c.visibility === 'unlisted' || c.author.id === userId
      )
    }

    // Apply query filters
    cubes = filterCubes(cubes, query)

    // Apply sorting
    cubes = sortCubes(cubes, query.sortBy, query.sortDirection)

    // Apply pagination
    const page = Math.max(1, query.page || 1)
    const pageSize = Math.min(
      API_CONSTANTS.MAX_PAGE_SIZE,
      Math.max(1, query.pageSize || API_CONSTANTS.DEFAULT_PAGE_SIZE)
    )
    const { items, meta } = paginate(cubes, page, pageSize)

    const response: ListCubesResponse = {
      cubes: items,
      pagination: meta,
      appliedFilters: query,
    }

    return createApiResponse(response)
  },

  /**
   * Updates an existing cube
   */
  async updateCube(
    id: string,
    request: UpdateCubeRequest,
    userId: string,
    userRole?: UserRole
  ): Promise<ApiResponse<UpdateCubeResponse>> {
    await simulateNetworkDelay(200)

    // Rate limit check
    const rateLimitTier = getRateLimitTierFromRole(userRole)
    const rateLimit = checkRateLimit(userId, '/api/cubes/:id', rateLimitTier)
    if (!rateLimit.allowed) {
      return createApiErrorResponse(
        createApiError('RATE_LIMIT_EXCEEDED', 'Too many update requests. Please try again later.')
      )
    }

    // Find the cube
    const cubeIndex = publishedCubesDb.findIndex((c) => c.id === id)
    if (cubeIndex === -1) {
      return createApiErrorResponse(
        createApiError('RESOURCE_NOT_FOUND', `Cube with ID '${id}' not found`)
      )
    }

    const cube = publishedCubesDb[cubeIndex]

    // Check permissions
    if (!canUpdateCube(cube, userId, userRole)) {
      return createApiErrorResponse(
        createApiError('PERMISSION_DENIED', 'You do not have permission to update this cube')
      )
    }

    // Validate request
    const validation = validateUpdateCubeRequest(request)
    if (!validation.valid) {
      return createApiErrorResponse(
        createApiError('VALIDATION_ERROR', 'Invalid update data', {
          fields: validation.errors,
        })
      )
    }

    // Apply updates
    let moderationRequired = false

    if (request.cube) {
      cube.cube = { ...cube.cube, ...request.cube }
    }

    if (request.visibility !== undefined) {
      // Changing to public requires moderation
      if (request.visibility === 'public' && cube.visibility !== 'public') {
        moderationRequired = true
        cube.status = 'under_review'
      }
      cube.visibility = request.visibility
    }

    if (request.category !== undefined) {
      cube.category = request.category
    }

    if (request.tags !== undefined) {
      cube.cube.meta = {
        ...cube.cube.meta,
        tags: request.tags,
      }
    }

    cube.updatedAt = now()

    // Re-run auto-moderation if cube content changed
    if (request.cube && moderationRequired) {
      const autoModeration = autoModerateCube(cube.cube)
      const moderationRecord = moderationRecordsDb.get(id)
      if (moderationRecord) {
        moderationRecord.autoModerationScore = autoModeration.score
        moderationRecord.autoModerationFlags = autoModeration.flags
        moderationRecord.status = 'pending'
        moderationRecord.updatedAt = now()
        saveModerationRecords()
      }
    }

    // Persist changes
    publishedCubesDb[cubeIndex] = cube
    savePublishedCubes()

    const response: UpdateCubeResponse = {
      cube,
      moderationRequired,
    }

    return createApiResponse(response)
  },

  /**
   * Deletes a cube
   */
  async deleteCube(
    id: string,
    userId: string,
    userRole?: UserRole
  ): Promise<ApiResponse<DeleteCubeResponse>> {
    await simulateNetworkDelay(150)

    // Rate limit check
    const rateLimitTier = getRateLimitTierFromRole(userRole)
    const rateLimit = checkRateLimit(userId, '/api/cubes/:id', rateLimitTier)
    if (!rateLimit.allowed) {
      return createApiErrorResponse(
        createApiError('RATE_LIMIT_EXCEEDED', 'Too many delete requests. Please try again later.')
      )
    }

    // Find the cube
    const cubeIndex = publishedCubesDb.findIndex((c) => c.id === id)
    if (cubeIndex === -1) {
      return createApiErrorResponse(
        createApiError('RESOURCE_NOT_FOUND', `Cube with ID '${id}' not found`)
      )
    }

    const cube = publishedCubesDb[cubeIndex]

    // Check permissions
    if (!canDeleteCube(cube, userId, userRole)) {
      return createApiErrorResponse(
        createApiError('PERMISSION_DENIED', 'You do not have permission to delete this cube')
      )
    }

    // Remove the cube
    publishedCubesDb.splice(cubeIndex, 1)

    // Remove moderation record
    moderationRecordsDb.delete(id)

    // Remove any content flags
    contentFlagsDb = contentFlagsDb.filter((f) => f.cubeId !== id)

    // Persist changes
    savePublishedCubes()
    saveModerationRecords()
    saveContentFlags()

    const response: DeleteCubeResponse = {
      deletedId: id,
      deletedAt: now(),
    }

    return createApiResponse(response)
  },

  // ==========================================================================
  // Moderation Operations
  // ==========================================================================

  /**
   * Gets the moderation queue (moderators/admins only)
   */
  async getModerationQueue(
    page: number = 1,
    pageSize: number = 20,
    userId: string,
    userRole?: UserRole
  ): Promise<ApiResponse<ModerationQueueResponse>> {
    await simulateNetworkDelay(200)

    // Check permissions
    if (!canModerate(userRole)) {
      return createApiErrorResponse(
        createApiError('PERMISSION_DENIED', 'Only moderators can access the moderation queue')
      )
    }

    // Get cubes pending moderation
    const pendingCubes = publishedCubesDb.filter((c) => {
      const modRecord = moderationRecordsDb.get(c.id)
      return modRecord?.status === 'pending' || modRecord?.status === 'flagged'
    })

    // Build queue items
    const queueItems: ModerationQueueItem[] = pendingCubes.map((cube) => {
      const modRecord = moderationRecordsDb.get(cube.id)!
      const flagCount = contentFlagsDb.filter((f) => f.cubeId === cube.id && !f.reviewed).length
      const timeInQueue = new Date(Date.now() - new Date(modRecord.createdAt).getTime())
        .toISOString()
        .substr(11, 8)

      // Priority: flagged > pending, more flags = higher priority
      const priority = (modRecord.status === 'flagged' ? 100 : 0) + flagCount * 10

      return {
        cube,
        moderation: modRecord,
        flagCount,
        priority,
        timeInQueue,
      }
    })

    // Sort by priority (highest first)
    queueItems.sort((a, b) => b.priority - a.priority)

    // Calculate stats
    const totalPending = pendingCubes.length
    const overdue = pendingCubes.filter((c) => {
      const modRecord = moderationRecordsDb.get(c.id)
      if (!modRecord) return false
      const hoursSinceCreation =
        (Date.now() - new Date(modRecord.createdAt).getTime()) / (1000 * 60 * 60)
      return hoursSinceCreation > 24
    }).length
    const flagged = pendingCubes.filter((c) => {
      const modRecord = moderationRecordsDb.get(c.id)
      return modRecord?.status === 'flagged'
    }).length

    const stats: ModerationQueueStats = {
      totalPending,
      overdue,
      flagged,
      averageReviewTime: 30, // Mock value
    }

    // Paginate
    const { items, meta } = paginate(queueItems, page, pageSize)

    const response: ModerationQueueResponse = {
      items,
      stats,
      pagination: meta,
    }

    return createApiResponse(response)
  },

  /**
   * Moderates a cube (approve/reject)
   */
  async moderateCube(
    cubeId: string,
    request: ModerateCubeRequest,
    moderatorId: string,
    userRole?: UserRole
  ): Promise<ApiResponse<ModerationRecord>> {
    await simulateNetworkDelay(200)

    // Check permissions
    if (!canModerate(userRole)) {
      return createApiErrorResponse(
        createApiError('PERMISSION_DENIED', 'Only moderators can moderate content')
      )
    }

    // Find the cube
    const cube = publishedCubesDb.find((c) => c.id === cubeId)
    if (!cube) {
      return createApiErrorResponse(
        createApiError('RESOURCE_NOT_FOUND', `Cube with ID '${cubeId}' not found`)
      )
    }

    // Get moderation record
    let moderationRecord = moderationRecordsDb.get(cubeId)
    if (!moderationRecord) {
      // Create one if it doesn't exist
      const autoModeration = autoModerateCube(cube.cube)
      moderationRecord = createModerationRecord(cubeId, autoModeration)
      moderationRecordsDb.set(cubeId, moderationRecord)
    }

    const previousStatus = moderationRecord.status

    // Apply moderation action
    let newStatus: ModerationStatus = previousStatus

    switch (request.action) {
      case 'approve':
        newStatus = 'approved'
        cube.status = 'published'
        break
      case 'reject':
        newStatus = 'rejected'
        cube.status = 'rejected'
        moderationRecord.rejectionReason = request.rejectionReason
        break
      case 'flag_for_review':
        newStatus = 'flagged'
        cube.status = 'under_review'
        break
      case 'escalate':
        newStatus = 'pending'
        break
      case 'unflag':
        newStatus = 'pending'
        // Mark related flags as reviewed
        contentFlagsDb = contentFlagsDb.map((f) =>
          f.cubeId === cubeId ? { ...f, reviewed: true } : f
        )
        saveContentFlags()
        break
    }

    // Update moderation record
    moderationRecord.status = newStatus
    moderationRecord.moderatorId = moderatorId
    moderationRecord.moderatorNotes = request.notes
    moderationRecord.updatedAt = now()

    // Add to history
    const historyEntry: ModerationHistoryEntry = {
      action: request.action,
      performedBy: moderatorId,
      previousStatus,
      newStatus,
      reason: request.notes || request.rejectionReason,
      timestamp: now(),
    }
    moderationRecord.history.push(historyEntry)

    // Persist changes
    moderationRecordsDb.set(cubeId, moderationRecord)
    savePublishedCubes()
    saveModerationRecords()

    return createApiResponse(moderationRecord)
  },

  /**
   * Flags content for review (user report)
   */
  async flagContent(
    cubeId: string,
    request: ContentFlagRequest,
    userId: string
  ): Promise<ApiResponse<ContentFlagResponse>> {
    await simulateNetworkDelay(150)

    // Rate limit check
    const rateLimit = checkRateLimit(userId, '/api/cubes/:id/flag', 'authenticated')
    if (!rateLimit.allowed) {
      return createApiErrorResponse(
        createApiError('RATE_LIMIT_EXCEEDED', 'Too many flag requests. Please try again later.')
      )
    }

    // Find the cube
    const cube = publishedCubesDb.find((c) => c.id === cubeId)
    if (!cube) {
      return createApiErrorResponse(
        createApiError('RESOURCE_NOT_FOUND', `Cube with ID '${cubeId}' not found`)
      )
    }

    // Check if user already flagged this cube
    const existingFlag = contentFlagsDb.find(
      (f) => f.cubeId === cubeId && f.userId === userId && !f.reviewed
    )
    if (existingFlag) {
      return createApiErrorResponse(
        createApiError('RESOURCE_CONFLICT', 'You have already flagged this content')
      )
    }

    // Create flag
    const flag: ContentFlag = {
      id: generateId('flag'),
      cubeId,
      userId,
      flagType: request.flagType,
      description: request.description,
      createdAt: now(),
      reviewed: false,
    }
    contentFlagsDb.push(flag)

    // Count flags for this cube
    const flagCount = contentFlagsDb.filter((f) => f.cubeId === cubeId && !f.reviewed).length

    // Auto-hide if threshold exceeded
    let autoHidden = false
    if (flagCount >= API_CONSTANTS.AUTO_HIDE_FLAG_THRESHOLD) {
      cube.visibility = 'unlisted'
      cube.status = 'under_review'

      const moderationRecord = moderationRecordsDb.get(cubeId)
      if (moderationRecord) {
        moderationRecord.status = 'flagged'
        moderationRecord.updatedAt = now()
        saveModerationRecords()
      }

      autoHidden = true
      savePublishedCubes()
    }

    saveContentFlags()

    const response: ContentFlagResponse = {
      flagId: flag.id,
      message: 'Thank you for your report. Our moderation team will review this content.',
      autoHidden,
    }

    return createApiResponse(response)
  },

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Performs batch operations on multiple cubes
   */
  async batchOperation(
    request: BatchOperationRequest,
    userId: string,
    userRole?: UserRole
  ): Promise<ApiResponse<BatchOperationResponse>> {
    await simulateNetworkDelay(300)

    const startTime = Date.now()
    const results: BatchOperationResultItem[] = []
    let successCount = 0
    let failCount = 0

    for (const op of request.operations) {
      try {
        let result: ApiResponse<unknown>

        switch (op.operation) {
          case 'update':
            result = await this.updateCube(
              op.cubeId,
              op.data as UpdateCubeRequest,
              userId,
              userRole
            )
            break
          case 'delete':
            result = await this.deleteCube(op.cubeId, userId, userRole)
            break
          case 'moderate':
            result = await this.moderateCube(
              op.cubeId,
              op.data as ModerateCubeRequest,
              userId,
              userRole
            )
            break
          default:
            throw new Error(`Unknown operation: ${op.operation}`)
        }

        if (result.success) {
          results.push({ cubeId: op.cubeId, success: true })
          successCount++
        } else {
          results.push({
            cubeId: op.cubeId,
            success: false,
            error: result.error?.message,
          })
          failCount++

          if (request.stopOnError) {
            break
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          cubeId: op.cubeId,
          success: false,
          error: errorMessage,
        })
        failCount++

        if (request.stopOnError) {
          break
        }
      }
    }

    const response: BatchOperationResponse = {
      results,
      successCount,
      failCount,
      totalTime: Date.now() - startTime,
    }

    return createApiResponse(response)
  },

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Gets rate limit status for a user
   */
  getRateLimitStatus(userId: string, endpoint: string, role?: UserRole): RateLimitStatus {
    const tier = getRateLimitTierFromRole(role)
    const tierConfig = RATE_LIMIT_TIERS[tier]
    const endpointConfig = ENDPOINT_RATE_LIMITS.find((e) =>
      endpoint.includes(e.path.replace(':id', ''))
    )
    const config = endpointConfig?.config || tierConfig

    const userState = rateLimitState.get(userId)
    const timestamps = userState?.get(endpoint) || []

    const currentTime = Date.now()
    const windowStart = currentTime - config.windowSeconds * 1000
    const validTimestamps = timestamps.filter((ts) => ts > windowStart)

    return {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - validTimestamps.length),
      reset: Math.ceil((windowStart + config.windowSeconds * 1000) / 1000),
    }
  },

  /**
   * Gets moderation record for a cube
   */
  async getModerationRecord(cubeId: string): Promise<ModerationRecord | null> {
    await simulateNetworkDelay(50)
    return moderationRecordsDb.get(cubeId) || null
  },

  /**
   * Gets user's published cubes
   */
  async getMyPublishedCubes(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<ListCubesResponse>> {
    return this.listCubes({ authorId: userId, page, pageSize }, userId, 'user')
  },

  // ==========================================================================
  // Testing Helpers
  // ==========================================================================

  /**
   * Resets all mock data (for testing)
   */
  _resetMockData(): void {
    publishedCubesDb = []
    moderationRecordsDb = new Map()
    contentFlagsDb = []
    rateLimitState = new Map()
    savePublishedCubes()
    saveModerationRecords()
    saveContentFlags()
  },

  /**
   * Gets published cubes (for testing)
   */
  _getPublishedCubes(): PublishedCube[] {
    return [...publishedCubesDb]
  },

  /**
   * Gets moderation records (for testing)
   */
  _getModerationRecords(): Map<string, ModerationRecord> {
    return new Map(moderationRecordsDb)
  },

  /**
   * Gets content flags (for testing)
   */
  _getContentFlags(): ContentFlag[] {
    return [...contentFlagsDb]
  },

  /**
   * Seeds mock data for testing
   */
  _seedMockData(cubes: PublishedCube[]): void {
    publishedCubesDb = [...cubes]
    cubes.forEach((cube) => {
      const autoModeration = autoModerateCube(cube.cube)
      const record = createModerationRecord(cube.id, autoModeration)
      record.status = cube.status === 'published' ? 'approved' : 'pending'
      moderationRecordsDb.set(cube.id, record)
    })
    savePublishedCubes()
    saveModerationRecords()
  },
}

export default publishingApiService

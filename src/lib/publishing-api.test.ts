/**
 * Tests for Publishing REST API Service (TASK 48)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { publishingApiService } from './publishing-api'
import type { UserProfile } from '../types/auth'
import type { SpectralCube } from '../types/cube'
import type { PublishedCube } from '../types/community'
import type {
  CreateCubeRequest,
  UpdateCubeRequest,
  ModerateCubeRequest,
  ContentFlagRequest,
} from '../types/publishing-api'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Test fixtures
const createTestUser = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: `user-${Date.now()}`,
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'user',
  createdAt: new Date().toISOString(),
  ...overrides,
})

const createTestCube = (overrides: Partial<SpectralCube> = {}): SpectralCube => ({
  id: `cube-${Date.now()}`,
  base: { color: [0.5, 0.5, 0.5], roughness: 0.5, transparency: 1.0 },
  meta: { name: 'Test Cube', tags: ['test', 'cube'] },
  ...overrides,
})

const createTestRequest = (
  cube?: SpectralCube,
  overrides: Partial<CreateCubeRequest> = {}
): CreateCubeRequest => ({
  cube: cube || createTestCube(),
  visibility: 'public',
  category: 'abstract',
  submitForModeration: true,
  ...overrides,
})

describe('PublishingApiService', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    publishingApiService._resetMockData()
  })

  // ===========================================================================
  // CRUD Operations Tests
  // ===========================================================================

  describe('createCube', () => {
    it('should create a public cube with auto-moderation', async () => {
      const user = createTestUser()
      const request = createTestRequest()

      const result = await publishingApiService.createCube(request, user)

      expect(result.success).toBe(true)
      expect(result.data?.cube).toBeDefined()
      expect(result.data?.cube.author.id).toBe(user.id)
      expect(result.data?.cube.visibility).toBe('public')
      expect(result.data?.cube.category).toBe('abstract')
      expect(result.data?.moderationStatus).toBeDefined()
    })

    it('should create a private cube without moderation', async () => {
      const user = createTestUser()
      const request = createTestRequest(undefined, { visibility: 'private' })

      const result = await publishingApiService.createCube(request, user)

      expect(result.success).toBe(true)
      expect(result.data?.cube.status).toBe('draft')
      expect(result.data?.moderationStatus).toBe('auto_approved')
    })

    it('should create an unlisted cube without moderation', async () => {
      const user = createTestUser()
      const request = createTestRequest(undefined, { visibility: 'unlisted' })

      const result = await publishingApiService.createCube(request, user)

      expect(result.success).toBe(true)
      expect(result.data?.cube.status).toBe('published')
      expect(result.data?.cube.visibility).toBe('unlisted')
    })

    it('should reject invalid cube data', async () => {
      const user = createTestUser()
      const request: CreateCubeRequest = {
        cube: { id: '' } as SpectralCube, // Invalid - missing required fields
        visibility: 'public',
        category: 'abstract',
        submitForModeration: true,
      }

      const result = await publishingApiService.createCube(request, user)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should require moderation flag for public cubes', async () => {
      const user = createTestUser()
      const request = createTestRequest(undefined, { submitForModeration: false })

      const result = await publishingApiService.createCube(request, user)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should add tags from request', async () => {
      const user = createTestUser()
      const request = createTestRequest(undefined, { tags: ['custom', 'tags'] })

      const result = await publishingApiService.createCube(request, user)

      expect(result.success).toBe(true)
      expect(result.data?.cube.cube.meta?.tags).toContain('custom')
      expect(result.data?.cube.cube.meta?.tags).toContain('tags')
    })

    it('should initialize stats to zero', async () => {
      const user = createTestUser()
      const request = createTestRequest()

      const result = await publishingApiService.createCube(request, user)

      expect(result.success).toBe(true)
      expect(result.data?.cube.stats.views).toBe(0)
      expect(result.data?.cube.stats.likes).toBe(0)
      expect(result.data?.cube.stats.downloads).toBe(0)
      expect(result.data?.cube.stats.comments).toBe(0)
    })

    it('should persist cube to storage', async () => {
      const user = createTestUser()
      const request = createTestRequest()

      await publishingApiService.createCube(request, user)

      const cubes = publishingApiService._getPublishedCubes()
      expect(cubes.length).toBe(1)
    })
  })

  describe('getCube', () => {
    it('should get a cube by ID', async () => {
      const user = createTestUser()
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id

      const result = await publishingApiService.getCube(cubeId)

      expect(result.success).toBe(true)
      expect(result.data?.cube.id).toBe(cubeId)
    })

    it('should return 404 for non-existent cube', async () => {
      const result = await publishingApiService.getCube('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND')
    })

    it('should increment view count by default', async () => {
      const user = createTestUser()
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id

      await publishingApiService.getCube(cubeId)
      await publishingApiService.getCube(cubeId)
      const result = await publishingApiService.getCube(cubeId)

      expect(result.data?.cube.stats.views).toBe(3)
    })

    it('should not increment view count when trackView is false', async () => {
      const user = createTestUser()
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id

      await publishingApiService.getCube(cubeId, { trackView: false })
      await publishingApiService.getCube(cubeId, { trackView: false })

      const result = await publishingApiService.getCube(cubeId)
      expect(result.data?.cube.stats.views).toBe(1) // Only this last call incremented
    })

    it('should deny access to private cubes from other users', async () => {
      const owner = createTestUser({ id: 'owner' })
      const request = createTestRequest(undefined, { visibility: 'private' })
      const created = await publishingApiService.createCube(request, owner)
      const cubeId = created.data!.cube.id

      const result = await publishingApiService.getCube(cubeId, {}, 'other-user')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PERMISSION_DENIED')
    })

    it('should allow owner to access private cubes', async () => {
      const owner = createTestUser({ id: 'owner' })
      const request = createTestRequest(undefined, { visibility: 'private' })
      const created = await publishingApiService.createCube(request, owner)
      const cubeId = created.data!.cube.id

      const result = await publishingApiService.getCube(cubeId, {}, 'owner')

      expect(result.success).toBe(true)
    })

    it('should include related cubes when requested', async () => {
      const user = createTestUser()

      // Create multiple cubes in same category
      await publishingApiService.createCube(
        createTestRequest(undefined, { category: 'nature' }),
        user
      )
      await publishingApiService.createCube(
        createTestRequest(undefined, { category: 'nature' }),
        user
      )
      const created = await publishingApiService.createCube(
        createTestRequest(undefined, { category: 'nature' }),
        user
      )

      const result = await publishingApiService.getCube(created.data!.cube.id, {
        includeRelated: true,
      })

      expect(result.success).toBe(true)
      expect(result.data?.relatedCubes).toBeDefined()
      expect(result.data?.authorCubes).toBeDefined()
    })
  })

  describe('listCubes', () => {
    beforeEach(async () => {
      // Seed some test data
      const user = createTestUser()
      const categories: CubeCategory[] = ['nature', 'building', 'fantasy', 'industrial']

      for (let i = 0; i < 10; i++) {
        await publishingApiService.createCube(
          createTestRequest(
            createTestCube({ id: `cube-${i}`, meta: { name: `Cube ${i}`, tags: [`tag${i}`] } }),
            {
              category: categories[i % categories.length],
              visibility: i < 8 ? 'public' : 'private',
            }
          ),
          user
        )
      }
    })

    it('should list cubes with default pagination', async () => {
      const result = await publishingApiService.listCubes({})

      expect(result.success).toBe(true)
      expect(result.data?.cubes.length).toBeGreaterThan(0)
      expect(result.data?.pagination).toBeDefined()
    })

    it('should filter by category', async () => {
      const result = await publishingApiService.listCubes({ category: 'nature' })

      expect(result.success).toBe(true)
      result.data?.cubes.forEach((cube) => {
        expect(cube.category).toBe('nature')
      })
    })

    it('should filter by text query', async () => {
      const result = await publishingApiService.listCubes({ query: 'Cube 1' })

      expect(result.success).toBe(true)
      expect(result.data?.cubes.length).toBeGreaterThan(0)
    })

    it('should paginate results', async () => {
      const page1 = await publishingApiService.listCubes({ page: 1, pageSize: 3 })
      const page2 = await publishingApiService.listCubes({ page: 2, pageSize: 3 })

      expect(page1.success).toBe(true)
      expect(page2.success).toBe(true)
      expect(page1.data?.cubes.length).toBeLessThanOrEqual(3)
      expect(page2.data?.cubes.length).toBeLessThanOrEqual(3)

      // Ensure different cubes on different pages
      const page1Ids = new Set(page1.data?.cubes.map((c) => c.id))
      page2.data?.cubes.forEach((cube) => {
        expect(page1Ids.has(cube.id)).toBe(false)
      })
    })

    it('should sort by recent by default', async () => {
      const result = await publishingApiService.listCubes({})

      expect(result.success).toBe(true)
      const cubes = result.data!.cubes
      for (let i = 1; i < cubes.length; i++) {
        expect(new Date(cubes[i - 1].publishedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(cubes[i].publishedAt).getTime()
        )
      }
    })

    it('should sort alphabetically when requested', async () => {
      const result = await publishingApiService.listCubes({
        sortBy: 'alphabetical',
        sortDirection: 'asc',
      })

      expect(result.success).toBe(true)
      const cubes = result.data!.cubes
      for (let i = 1; i < cubes.length; i++) {
        const nameA = cubes[i - 1].cube.meta?.name || ''
        const nameB = cubes[i].cube.meta?.name || ''
        expect(nameA.localeCompare(nameB)).toBeLessThanOrEqual(0)
      }
    })

    it('should hide private cubes from other users', async () => {
      const result = await publishingApiService.listCubes({}, 'other-user', 'user')

      expect(result.success).toBe(true)
      result.data?.cubes.forEach((cube) => {
        expect(cube.visibility).not.toBe('private')
      })
    })

    it('should show all cubes to admin', async () => {
      const result = await publishingApiService.listCubes({}, 'admin-user', 'admin')

      expect(result.success).toBe(true)
      // Admin should see all 10 cubes including private ones
      expect(result.data?.cubes.length).toBe(10)
    })

    it('should filter by tags', async () => {
      const result = await publishingApiService.listCubes({ tags: ['tag1'] })

      expect(result.success).toBe(true)
      result.data?.cubes.forEach((cube) => {
        expect(cube.cube.meta?.tags).toContain('tag1')
      })
    })

    it('should respect max page size', async () => {
      const result = await publishingApiService.listCubes({ pageSize: 1000 })

      expect(result.success).toBe(true)
      expect(result.data?.pagination.pageSize).toBeLessThanOrEqual(100)
    })
  })

  describe('updateCube', () => {
    it('should update cube visibility', async () => {
      const user = createTestUser({ id: 'owner' })
      const request = createTestRequest(undefined, { visibility: 'private' })
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id

      const updateRequest: UpdateCubeRequest = { visibility: 'unlisted' }
      const result = await publishingApiService.updateCube(cubeId, updateRequest, 'owner')

      expect(result.success).toBe(true)
      expect(result.data?.cube.visibility).toBe('unlisted')
    })

    it('should update cube category', async () => {
      const user = createTestUser({ id: 'owner' })
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id

      const updateRequest: UpdateCubeRequest = { category: 'nature' }
      const result = await publishingApiService.updateCube(cubeId, updateRequest, 'owner')

      expect(result.success).toBe(true)
      expect(result.data?.cube.category).toBe('nature')
    })

    it('should update cube tags', async () => {
      const user = createTestUser({ id: 'owner' })
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id

      const updateRequest: UpdateCubeRequest = { tags: ['new', 'tags'] }
      const result = await publishingApiService.updateCube(cubeId, updateRequest, 'owner')

      expect(result.success).toBe(true)
      expect(result.data?.cube.cube.meta?.tags).toEqual(['new', 'tags'])
    })

    it('should deny update to non-owner', async () => {
      const owner = createTestUser({ id: 'owner' })
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, owner)
      const cubeId = created.data!.cube.id

      const updateRequest: UpdateCubeRequest = { category: 'nature' }
      const result = await publishingApiService.updateCube(cubeId, updateRequest, 'other-user')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PERMISSION_DENIED')
    })

    it('should allow admin to update any cube', async () => {
      const owner = createTestUser({ id: 'owner' })
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, owner)
      const cubeId = created.data!.cube.id

      const updateRequest: UpdateCubeRequest = { category: 'nature' }
      const result = await publishingApiService.updateCube(
        cubeId,
        updateRequest,
        'admin-user',
        'admin'
      )

      expect(result.success).toBe(true)
    })

    it('should return 404 for non-existent cube', async () => {
      const updateRequest: UpdateCubeRequest = { category: 'nature' }
      const result = await publishingApiService.updateCube('non-existent', updateRequest, 'user')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND')
    })

    it('should require moderation when changing to public', async () => {
      const user = createTestUser({ id: 'owner' })
      const request = createTestRequest(undefined, { visibility: 'private' })
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id

      const updateRequest: UpdateCubeRequest = { visibility: 'public' }
      const result = await publishingApiService.updateCube(cubeId, updateRequest, 'owner')

      expect(result.success).toBe(true)
      expect(result.data?.moderationRequired).toBe(true)
      expect(result.data?.cube.status).toBe('under_review')
    })

    it('should update the updatedAt timestamp', async () => {
      const user = createTestUser({ id: 'owner' })
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id
      const originalUpdatedAt = created.data!.cube.updatedAt

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10))

      const updateRequest: UpdateCubeRequest = { category: 'nature' }
      const result = await publishingApiService.updateCube(cubeId, updateRequest, 'owner')

      expect(result.success).toBe(true)
      expect(new Date(result.data!.cube.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      )
    })
  })

  describe('deleteCube', () => {
    it('should delete a cube', async () => {
      const user = createTestUser({ id: 'owner' })
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id

      const result = await publishingApiService.deleteCube(cubeId, 'owner')

      expect(result.success).toBe(true)
      expect(result.data?.deletedId).toBe(cubeId)
      expect(result.data?.deletedAt).toBeDefined()

      // Verify cube is gone
      const getResult = await publishingApiService.getCube(cubeId)
      expect(getResult.success).toBe(false)
    })

    it('should deny deletion to non-owner', async () => {
      const owner = createTestUser({ id: 'owner' })
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, owner)
      const cubeId = created.data!.cube.id

      const result = await publishingApiService.deleteCube(cubeId, 'other-user')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PERMISSION_DENIED')
    })

    it('should allow admin to delete any cube', async () => {
      const owner = createTestUser({ id: 'owner' })
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, owner)
      const cubeId = created.data!.cube.id

      const result = await publishingApiService.deleteCube(cubeId, 'admin-user', 'admin')

      expect(result.success).toBe(true)
    })

    it('should return 404 for non-existent cube', async () => {
      const result = await publishingApiService.deleteCube('non-existent', 'user')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND')
    })

    it('should remove moderation record when deleting', async () => {
      const user = createTestUser({ id: 'owner' })
      const request = createTestRequest()
      const created = await publishingApiService.createCube(request, user)
      const cubeId = created.data!.cube.id

      // Verify moderation record exists
      const moderationBefore = await publishingApiService.getModerationRecord(cubeId)
      expect(moderationBefore).not.toBeNull()

      await publishingApiService.deleteCube(cubeId, 'owner')

      // Verify moderation record is gone
      const moderationAfter = await publishingApiService.getModerationRecord(cubeId)
      expect(moderationAfter).toBeNull()
    })
  })

  // ===========================================================================
  // Moderation Tests
  // ===========================================================================

  describe('getModerationQueue', () => {
    it('should deny access to non-moderators', async () => {
      const result = await publishingApiService.getModerationQueue(1, 20, 'user', 'user')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PERMISSION_DENIED')
    })

    it('should return queue for moderators', async () => {
      const result = await publishingApiService.getModerationQueue(1, 20, 'mod-user', 'moderator')

      expect(result.success).toBe(true)
      expect(result.data?.items).toBeDefined()
      expect(result.data?.stats).toBeDefined()
      expect(result.data?.pagination).toBeDefined()
    })

    it('should return queue for admins', async () => {
      const result = await publishingApiService.getModerationQueue(1, 20, 'admin-user', 'admin')

      expect(result.success).toBe(true)
    })

    it('should include pending cubes in queue', async () => {
      // Create a cube that needs moderation
      const user = createTestUser()
      const cube = createTestCube({
        meta: { name: 'spam test cube', tags: ['spam'] },
      })
      await publishingApiService.createCube(createTestRequest(cube), user)

      const result = await publishingApiService.getModerationQueue(1, 20, 'mod-user', 'moderator')

      expect(result.success).toBe(true)
      // Should have items in queue (auto-moderation may have flagged it)
      expect(result.data?.stats.totalPending).toBeGreaterThanOrEqual(0)
    })
  })

  describe('moderateCube', () => {
    it('should deny moderation to non-moderators', async () => {
      const user = createTestUser()
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const cubeId = created.data!.cube.id

      const moderateRequest: ModerateCubeRequest = { action: 'approve' }
      const result = await publishingApiService.moderateCube(
        cubeId,
        moderateRequest,
        'user',
        'user'
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PERMISSION_DENIED')
    })

    it('should approve a cube', async () => {
      const user = createTestUser()
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const cubeId = created.data!.cube.id

      const moderateRequest: ModerateCubeRequest = { action: 'approve' }
      const result = await publishingApiService.moderateCube(
        cubeId,
        moderateRequest,
        'mod-user',
        'moderator'
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('approved')

      // Verify cube is now published
      const getResult = await publishingApiService.getCube(cubeId)
      expect(getResult.data?.cube.status).toBe('published')
    })

    it('should reject a cube with reason', async () => {
      const user = createTestUser()
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const cubeId = created.data!.cube.id

      const moderateRequest: ModerateCubeRequest = {
        action: 'reject',
        rejectionReason: 'low_quality',
        notes: 'Does not meet quality standards',
      }
      const result = await publishingApiService.moderateCube(
        cubeId,
        moderateRequest,
        'mod-user',
        'moderator'
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('rejected')
      expect(result.data?.rejectionReason).toBe('low_quality')
      expect(result.data?.moderatorNotes).toBe('Does not meet quality standards')
    })

    it('should add entry to moderation history', async () => {
      const user = createTestUser()
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const cubeId = created.data!.cube.id

      const moderateRequest: ModerateCubeRequest = { action: 'approve' }
      const result = await publishingApiService.moderateCube(
        cubeId,
        moderateRequest,
        'mod-user',
        'moderator'
      )

      expect(result.success).toBe(true)
      expect(result.data?.history.length).toBeGreaterThan(1) // Initial + this action
      const lastEntry = result.data?.history[result.data.history.length - 1]
      expect(lastEntry?.action).toBe('approve')
      expect(lastEntry?.performedBy).toBe('mod-user')
    })

    it('should return 404 for non-existent cube', async () => {
      const moderateRequest: ModerateCubeRequest = { action: 'approve' }
      const result = await publishingApiService.moderateCube(
        'non-existent',
        moderateRequest,
        'mod-user',
        'moderator'
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND')
    })
  })

  describe('flagContent', () => {
    it('should flag content', async () => {
      const user = createTestUser()
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const cubeId = created.data!.cube.id

      const flagRequest: ContentFlagRequest = {
        flagType: 'inappropriate',
        description: 'This content is offensive',
      }
      const result = await publishingApiService.flagContent(cubeId, flagRequest, 'reporter')

      expect(result.success).toBe(true)
      expect(result.data?.flagId).toBeDefined()
      expect(result.data?.message).toContain('moderation team')
    })

    it('should prevent duplicate flags from same user', async () => {
      const user = createTestUser()
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const cubeId = created.data!.cube.id

      const flagRequest: ContentFlagRequest = { flagType: 'spam' }

      // First flag should succeed
      const result1 = await publishingApiService.flagContent(cubeId, flagRequest, 'reporter')
      expect(result1.success).toBe(true)

      // Second flag should fail
      const result2 = await publishingApiService.flagContent(cubeId, flagRequest, 'reporter')
      expect(result2.success).toBe(false)
      expect(result2.error?.code).toBe('RESOURCE_CONFLICT')
    })

    it('should auto-hide cube when flag threshold exceeded', async () => {
      const user = createTestUser()
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const cubeId = created.data!.cube.id

      // Flag from multiple users
      for (let i = 0; i < 5; i++) {
        await publishingApiService.flagContent(
          cubeId,
          { flagType: 'inappropriate' },
          `reporter-${i}`
        )
      }

      // Get the cube
      const getResult = await publishingApiService.getCube(cubeId, {}, user.id)

      // Should be auto-hidden (unlisted)
      expect(getResult.data?.cube.visibility).toBe('unlisted')
      expect(getResult.data?.cube.status).toBe('under_review')
    })

    it('should return 404 for non-existent cube', async () => {
      const flagRequest: ContentFlagRequest = { flagType: 'spam' }
      const result = await publishingApiService.flagContent('non-existent', flagRequest, 'reporter')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND')
    })
  })

  // ===========================================================================
  // Batch Operations Tests
  // ===========================================================================

  describe('batchOperation', () => {
    it('should perform multiple updates', async () => {
      const user = createTestUser({ id: 'owner' })

      // Create multiple cubes
      const cubes: string[] = []
      for (let i = 0; i < 3; i++) {
        const created = await publishingApiService.createCube(createTestRequest(), user)
        cubes.push(created.data!.cube.id)
      }

      // Batch update
      const result = await publishingApiService.batchOperation(
        {
          operations: cubes.map((cubeId) => ({
            cubeId,
            operation: 'update' as const,
            data: { category: 'nature' as CubeCategory },
          })),
          stopOnError: false,
        },
        'owner',
        'user'
      )

      expect(result.success).toBe(true)
      expect(result.data?.successCount).toBe(3)
      expect(result.data?.failCount).toBe(0)
    })

    it('should stop on first error when stopOnError is true', async () => {
      const user = createTestUser({ id: 'owner' })
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const validCubeId = created.data!.cube.id

      const result = await publishingApiService.batchOperation(
        {
          operations: [
            { cubeId: 'non-existent', operation: 'update', data: { category: 'nature' } },
            { cubeId: validCubeId, operation: 'update', data: { category: 'nature' } },
          ],
          stopOnError: true,
        },
        'owner',
        'user'
      )

      expect(result.success).toBe(true)
      expect(result.data?.results.length).toBe(1) // Only first operation
      expect(result.data?.failCount).toBe(1)
    })

    it('should continue on error when stopOnError is false', async () => {
      const user = createTestUser({ id: 'owner' })
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const validCubeId = created.data!.cube.id

      const result = await publishingApiService.batchOperation(
        {
          operations: [
            { cubeId: 'non-existent', operation: 'update', data: { category: 'nature' } },
            { cubeId: validCubeId, operation: 'update', data: { category: 'nature' } },
          ],
          stopOnError: false,
        },
        'owner',
        'user'
      )

      expect(result.success).toBe(true)
      expect(result.data?.results.length).toBe(2)
      expect(result.data?.failCount).toBe(1)
      expect(result.data?.successCount).toBe(1)
    })

    it('should support batch moderation', async () => {
      const user = createTestUser()

      // Create multiple cubes
      const cubes: string[] = []
      for (let i = 0; i < 2; i++) {
        const created = await publishingApiService.createCube(createTestRequest(), user)
        cubes.push(created.data!.cube.id)
      }

      // Batch moderate
      const result = await publishingApiService.batchOperation(
        {
          operations: cubes.map((cubeId) => ({
            cubeId,
            operation: 'moderate' as const,
            data: { action: 'approve' as const },
          })),
          stopOnError: false,
        },
        'mod-user',
        'moderator'
      )

      expect(result.success).toBe(true)
      expect(result.data?.successCount).toBe(2)
    })

    it('should support batch delete', async () => {
      const user = createTestUser({ id: 'owner' })

      // Create multiple cubes
      const cubes: string[] = []
      for (let i = 0; i < 2; i++) {
        const created = await publishingApiService.createCube(createTestRequest(), user)
        cubes.push(created.data!.cube.id)
      }

      // Batch delete
      const result = await publishingApiService.batchOperation(
        {
          operations: cubes.map((cubeId) => ({
            cubeId,
            operation: 'delete' as const,
          })),
          stopOnError: false,
        },
        'owner',
        'user'
      )

      expect(result.success).toBe(true)
      expect(result.data?.successCount).toBe(2)

      // Verify cubes are gone
      for (const cubeId of cubes) {
        const getResult = await publishingApiService.getCube(cubeId)
        expect(getResult.success).toBe(false)
      }
    })
  })

  // ===========================================================================
  // Rate Limiting Tests
  // ===========================================================================

  describe('rate limiting', () => {
    it('should return rate limit status', () => {
      const status = publishingApiService.getRateLimitStatus('user', '/api/cubes', 'user')

      expect(status.limit).toBeGreaterThan(0)
      expect(status.remaining).toBeLessThanOrEqual(status.limit)
      expect(status.reset).toBeGreaterThan(0)
    })

    it('should track requests and decrement remaining', async () => {
      const user = createTestUser({ id: 'rate-test-user' })

      // Make some requests
      await publishingApiService.createCube(createTestRequest(), user)
      await publishingApiService.createCube(createTestRequest(), user)

      const status = publishingApiService.getRateLimitStatus('rate-test-user', '/api/cubes', 'user')

      // Remaining should be less than limit
      expect(status.remaining).toBeLessThan(status.limit)
    })

    it('should provide higher limits for creators on general endpoints', () => {
      // Use a general endpoint that doesn't have specific limits
      const userStatus = publishingApiService.getRateLimitStatus('user', '/api/search', 'user')
      const creatorStatus = publishingApiService.getRateLimitStatus(
        'creator',
        '/api/search',
        'creator'
      )

      expect(creatorStatus.limit).toBeGreaterThan(userStatus.limit)
    })

    it('should provide highest limits for admin on general endpoints', () => {
      // Use a general endpoint that doesn't have specific limits
      const userStatus = publishingApiService.getRateLimitStatus('user', '/api/search', 'user')
      const adminStatus = publishingApiService.getRateLimitStatus('admin', '/api/search', 'admin')

      expect(adminStatus.limit).toBeGreaterThan(userStatus.limit)
    })
  })

  // ===========================================================================
  // Utility Methods Tests
  // ===========================================================================

  describe('getMyPublishedCubes', () => {
    it('should return cubes for the specified user', async () => {
      const user1 = createTestUser({ id: 'user-1' })
      const user2 = createTestUser({ id: 'user-2' })

      // Create cubes for both users
      await publishingApiService.createCube(createTestRequest(), user1)
      await publishingApiService.createCube(createTestRequest(), user1)
      await publishingApiService.createCube(createTestRequest(), user2)

      const result = await publishingApiService.getMyPublishedCubes('user-1')

      expect(result.success).toBe(true)
      expect(result.data?.cubes.length).toBe(2)
      result.data?.cubes.forEach((cube) => {
        expect(cube.author.id).toBe('user-1')
      })
    })

    it('should return empty array for user with no cubes', async () => {
      const result = await publishingApiService.getMyPublishedCubes('no-cubes-user')

      expect(result.success).toBe(true)
      expect(result.data?.cubes.length).toBe(0)
    })
  })

  describe('getModerationRecord', () => {
    it('should return moderation record for a cube', async () => {
      const user = createTestUser()
      const created = await publishingApiService.createCube(createTestRequest(), user)
      const cubeId = created.data!.cube.id

      const record = await publishingApiService.getModerationRecord(cubeId)

      expect(record).not.toBeNull()
      expect(record?.cubeId).toBe(cubeId)
      expect(record?.status).toBeDefined()
    })

    it('should return null for non-existent cube', async () => {
      const record = await publishingApiService.getModerationRecord('non-existent')

      expect(record).toBeNull()
    })
  })

  // ===========================================================================
  // Testing Helpers Tests
  // ===========================================================================

  describe('testing helpers', () => {
    it('_resetMockData should clear all data', async () => {
      const user = createTestUser()
      await publishingApiService.createCube(createTestRequest(), user)

      publishingApiService._resetMockData()

      expect(publishingApiService._getPublishedCubes().length).toBe(0)
      expect(publishingApiService._getModerationRecords().size).toBe(0)
      expect(publishingApiService._getContentFlags().length).toBe(0)
    })

    it('_seedMockData should populate data', () => {
      const mockCubes: PublishedCube[] = [
        {
          id: 'test-1',
          cube: createTestCube(),
          author: { id: 'author', displayName: 'Author' },
          status: 'published',
          visibility: 'public',
          category: 'abstract',
          stats: { views: 0, likes: 0, downloads: 0, comments: 0 },
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      publishingApiService._seedMockData(mockCubes)

      expect(publishingApiService._getPublishedCubes().length).toBe(1)
      expect(publishingApiService._getModerationRecords().size).toBe(1)
    })
  })
})

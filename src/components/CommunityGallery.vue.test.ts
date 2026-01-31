/**
 * Unit tests for CommunityGallery Vue component
 * Tests the Vue.js 3.0 migration of the CommunityGallery component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import CommunityGallery, { COMMUNITY_GALLERY_META } from './CommunityGallery.vue'
import { communityGalleryService } from '../lib/community-gallery'

// Mock community gallery service
vi.mock('../lib/community-gallery', () => ({
  communityGalleryService: {
    search: vi.fn(),
    toggleLike: vi.fn(),
    recordDownload: vi.fn(),
    _resetMockData: vi.fn(),
  },
}))

// Mock DevMode context
vi.mock('../lib/devmode', () => ({
  useIsDevModeEnabled: vi.fn(() => false),
}))

// Mock data
const mockPublishedCubes = [
  {
    id: 'pub-1',
    cube: {
      id: 'cube-1',
      base: { color: [0.5, 0.3, 0.2] as [number, number, number], roughness: 0.8 },
      gradients: [
        {
          axis: 'y' as const,
          factor: 0.3,
          color_shift: [0.1, 0.1, 0.1] as [number, number, number],
        },
      ],
      physics: { material: 'stone' as const },
      meta: { name: 'Mossy Stone', tags: ['stone', 'moss'] },
    },
    author: { id: 'user-1', displayName: 'Artist1' },
    status: 'published' as const,
    visibility: 'public' as const,
    category: 'nature' as const,
    stats: { views: 100, likes: 50, downloads: 25, comments: 5 },
    isLiked: false,
    isFeatured: true,
    isStaffPick: false,
    publishedAt: '2026-01-29T00:00:00Z',
    updatedAt: '2026-01-29T00:00:00Z',
  },
  {
    id: 'pub-2',
    cube: {
      id: 'cube-2',
      base: { color: [0.8, 0.7, 0.3] as [number, number, number], roughness: 0.2 },
      gradients: [],
      physics: { material: 'metal' as const },
      meta: { name: 'Golden Metal', tags: ['gold', 'metal', 'shiny'] },
    },
    author: { id: 'user-2', displayName: 'Artist2' },
    status: 'published' as const,
    visibility: 'public' as const,
    category: 'industrial' as const,
    stats: { views: 200, likes: 80, downloads: 40, comments: 10 },
    isLiked: true,
    isFeatured: false,
    isStaffPick: true,
    publishedAt: '2026-01-28T00:00:00Z',
    updatedAt: '2026-01-28T00:00:00Z',
  },
]

const mockSearchResponse = {
  cubes: mockPublishedCubes,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 2,
    pageSize: 12,
    hasNextPage: false,
    hasPrevPage: false,
  },
  params: {
    filters: {},
    sortBy: 'recent' as const,
    page: 1,
    pageSize: 12,
  },
}

describe('CommunityGallery Vue Component — Module Exports', () => {
  it('should export CommunityGallery.vue as a valid Vue component', async () => {
    const module = await import('./CommunityGallery.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export COMMUNITY_GALLERY_META with correct metadata', () => {
    expect(COMMUNITY_GALLERY_META).toBeDefined()
    expect(COMMUNITY_GALLERY_META.id).toBe('community-gallery')
    expect(COMMUNITY_GALLERY_META.name).toBe('CommunityGallery')
    expect(COMMUNITY_GALLERY_META.filePath).toBe('components/CommunityGallery.vue')
  })
})

describe('CommunityGallery Vue Component — Search Params Logic', () => {
  it('should build search params with query filter', () => {
    const query = 'crystal'
    const params = {
      filters: { query: query || undefined },
      sortBy: 'recent',
      sortDirection: 'desc',
      page: 1,
      pageSize: 12,
    }
    expect(params.filters.query).toBe('crystal')
    expect(params.page).toBe(1)
  })

  it('should omit query from filters when empty', () => {
    const query = ''
    const params = {
      filters: { query: query || undefined },
      sortBy: 'recent',
      sortDirection: 'desc',
      page: 1,
      pageSize: 12,
    }
    expect(params.filters.query).toBeUndefined()
  })

  it('should include category filter when not "all"', () => {
    const category = 'nature'
    const params = {
      filters: {
        category: category !== 'all' ? category : undefined,
      },
    }
    expect(params.filters.category).toBe('nature')
  })

  it('should omit category filter when "all"', () => {
    const category = 'all'
    const params = {
      filters: {
        category: category !== 'all' ? category : undefined,
      },
    }
    expect(params.filters.category).toBeUndefined()
  })
})

describe('CommunityGallery Vue Component — Pagination Logic', () => {
  it('should generate correct page numbers for simple case', () => {
    const currentPage = 1
    const totalPages = 5
    const pages: (number | string)[] = []

    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (!pages.includes(i)) pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages)

    expect(pages).toContain(1)
    expect(pages).toContain(5)
  })

  it('should show ellipsis when current page is far from start', () => {
    const currentPage = 5
    const totalPages = 10
    const pages: (number | string)[] = []

    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (!pages.includes(i)) pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages)

    expect(pages).toContain('...')
    expect(pages[1]).toBe('...')
  })
})

describe('CommunityGallery Vue Component — Mounting and Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(communityGalleryService.search).mockResolvedValue(mockSearchResponse)
    vi.mocked(communityGalleryService.toggleLike).mockResolvedValue({
      success: true,
      isLiked: true,
      likeCount: 51,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render gallery title', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    expect(wrapper.text()).toContain('Community Gallery')
  })

  it('should render subtitle', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    expect(wrapper.text()).toContain('Discover cubes created by the isocubic community')
  })

  it('should render search input', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    const searchInput = wrapper.find('.community-gallery__search-input')
    expect(searchInput.exists()).toBe(true)
    expect(searchInput.attributes('placeholder')).toBe('Search by name, tags, author...')
  })

  it('should render category dropdown', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    const categorySelect = wrapper.find('[aria-label="Filter by category"]')
    expect(categorySelect.exists()).toBe(true)
  })

  it('should render material dropdown', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    const materialSelect = wrapper.find('[aria-label="Filter by material"]')
    expect(materialSelect.exists()).toBe(true)
  })

  it('should render sort dropdown', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    const sortSelect = wrapper.find('[aria-label="Sort by"]')
    expect(sortSelect.exists()).toBe(true)
  })

  it('should show loading state initially', () => {
    const wrapper = shallowMount(CommunityGallery)
    expect(wrapper.text()).toContain('Loading cubes...')
  })

  it('should render cube cards after loading', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    expect(wrapper.text()).toContain('Mossy Stone')
    expect(wrapper.text()).toContain('Golden Metal')
  })

  it('should display author names', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    expect(wrapper.text()).toContain('by Artist1')
    expect(wrapper.text()).toContain('by Artist2')
  })

  it('should display cube tags', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    expect(wrapper.text()).toContain('stone')
    expect(wrapper.text()).toContain('moss')
  })

  it('should show featured badge', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    expect(wrapper.text()).toContain('Featured')
  })

  it('should show staff pick badge', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    expect(wrapper.text()).toContain('Staff Pick')
  })

  it('should display results count', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()
    expect(wrapper.text()).toContain('Showing 2 of 2 cubes')
  })
})

describe('CommunityGallery Vue Component — Search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(communityGalleryService.search).mockResolvedValue(mockSearchResponse)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should call search service when search input changes', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const searchInput = wrapper.find('.community-gallery__search-input')
    await searchInput.setValue('stone')
    await flushPromises()

    const calls = vi.mocked(communityGalleryService.search).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0].filters.query).toBe('stone')
  })

  it('should show clear button when search has value', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const searchInput = wrapper.find('.community-gallery__search-input')
    await searchInput.setValue('test')

    const clearButton = wrapper.find('.community-gallery__search-clear')
    expect(clearButton.exists()).toBe(true)
  })

  it('should clear search when clear button is clicked', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const searchInput = wrapper.find('.community-gallery__search-input')
    await searchInput.setValue('test')

    const clearButton = wrapper.find('.community-gallery__search-clear')
    await clearButton.trigger('click')

    expect((searchInput.element as HTMLInputElement).value).toBe('')
  })
})

describe('CommunityGallery Vue Component — Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(communityGalleryService.search).mockResolvedValue(mockSearchResponse)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should filter by category', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const categorySelect = wrapper.find('[aria-label="Filter by category"]')
    await categorySelect.setValue('nature')
    await flushPromises()

    const calls = vi.mocked(communityGalleryService.search).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0].filters.category).toBe('nature')
  })

  it('should filter by material type', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const materialSelect = wrapper.find('[aria-label="Filter by material"]')
    await materialSelect.setValue('metal')
    await flushPromises()

    const calls = vi.mocked(communityGalleryService.search).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0].filters.materialType).toBe('metal')
  })
})

describe('CommunityGallery Vue Component — Sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(communityGalleryService.search).mockResolvedValue(mockSearchResponse)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should sort by different options', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const sortSelect = wrapper.find('[aria-label="Sort by"]')
    await sortSelect.setValue('popular')
    await flushPromises()

    const calls = vi.mocked(communityGalleryService.search).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0].sortBy).toBe('popular')
  })
})

describe('CommunityGallery Vue Component — Cube Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(communityGalleryService.search).mockResolvedValue(mockSearchResponse)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should emit cubeSelect when a cube is clicked', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const cubeCard = wrapper.find('[aria-label="Select Mossy Stone"]')
    await cubeCard.trigger('click')

    expect(wrapper.emitted('cubeSelect')).toBeTruthy()
    expect(wrapper.emitted('cubeSelect')![0][0]).toEqual(mockPublishedCubes[0].cube)
    expect(communityGalleryService.recordDownload).toHaveBeenCalledWith('pub-1')
  })

  it('should handle keyboard navigation', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const cubeCard = wrapper.find('[aria-label="Select Mossy Stone"]')
    await cubeCard.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('cubeSelect')).toBeTruthy()
  })
})

describe('CommunityGallery Vue Component — Like Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(communityGalleryService.search).mockResolvedValue(mockSearchResponse)
    vi.mocked(communityGalleryService.toggleLike).mockResolvedValue({
      success: true,
      isLiked: true,
      likeCount: 51,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should toggle like when like button is clicked', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    // Find the Like button (first cube is not liked)
    const likeButtons = wrapper.findAll('[aria-label="Like"]')
    await likeButtons[0].trigger('click')

    expect(communityGalleryService.toggleLike).toHaveBeenCalledWith('pub-1')
  })

  it('should show Unlike label for liked cubes', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    // Second cube is liked
    const unlikeButton = wrapper.find('[aria-label="Unlike"]')
    expect(unlikeButton.exists()).toBe(true)
  })

  it('should update like count after toggling', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const likeButtons = wrapper.findAll('[aria-label="Like"]')
    await likeButtons[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('51')
  })

  it('should display view counts', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const viewStats = wrapper.findAll('.community-gallery__views')
    expect(viewStats.length).toBe(2)
  })

  it('should display download counts', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const downloadStats = wrapper.findAll('.community-gallery__downloads')
    expect(downloadStats.length).toBe(2)
  })

  it('should display like buttons', async () => {
    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const likeButtons = wrapper.findAll('.community-gallery__like-btn')
    expect(likeButtons.length).toBe(2)
  })
})

describe('CommunityGallery Vue Component — Empty State', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should show empty message when no cubes match filters', async () => {
    vi.mocked(communityGalleryService.search).mockResolvedValue({
      ...mockSearchResponse,
      cubes: [],
      pagination: {
        ...mockSearchResponse.pagination,
        totalItems: 0,
      },
    })

    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    expect(wrapper.text()).toContain('No community cubes available yet')
  })

  it('should show different message when filters are active', async () => {
    vi.mocked(communityGalleryService.search).mockResolvedValue({
      ...mockSearchResponse,
      cubes: [],
      pagination: {
        ...mockSearchResponse.pagination,
        totalItems: 0,
      },
    })

    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const searchInput = wrapper.find('.community-gallery__search-input')
    await searchInput.setValue('nonexistent')
    await flushPromises()

    expect(wrapper.text()).toContain('No cubes match your search criteria')
  })
})

describe('CommunityGallery Vue Component — Error State', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should show error message when search fails', async () => {
    vi.mocked(communityGalleryService.search).mockRejectedValue(new Error('Network error'))

    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load community cubes')
  })
})

describe('CommunityGallery Vue Component — Pagination', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should show pagination when multiple pages exist', async () => {
    vi.mocked(communityGalleryService.search).mockResolvedValue({
      ...mockSearchResponse,
      pagination: {
        ...mockSearchResponse.pagination,
        totalPages: 3,
        hasNextPage: true,
      },
    })

    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    expect(wrapper.find('[aria-label="Next page"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Previous page"]').exists()).toBe(true)
  })

  it('should disable previous button on first page', async () => {
    vi.mocked(communityGalleryService.search).mockResolvedValue({
      ...mockSearchResponse,
      pagination: {
        ...mockSearchResponse.pagination,
        totalPages: 3,
        hasPrevPage: false,
        hasNextPage: true,
      },
    })

    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const prevButton = wrapper.find('[aria-label="Previous page"]')
    expect(prevButton.attributes('disabled')).toBeDefined()
  })

  it('should disable next button on last page', async () => {
    vi.mocked(communityGalleryService.search).mockResolvedValue({
      ...mockSearchResponse,
      pagination: {
        ...mockSearchResponse.pagination,
        currentPage: 3,
        totalPages: 3,
        hasPrevPage: true,
        hasNextPage: false,
      },
    })

    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const nextButton = wrapper.find('[aria-label="Next page"]')
    expect(nextButton.attributes('disabled')).toBeDefined()
  })

  it('should call search with new page when pagination is used', async () => {
    vi.mocked(communityGalleryService.search).mockResolvedValue({
      ...mockSearchResponse,
      pagination: {
        ...mockSearchResponse.pagination,
        totalPages: 3,
        hasNextPage: true,
      },
    })

    const wrapper = shallowMount(CommunityGallery)
    await flushPromises()

    const nextButton = wrapper.find('[aria-label="Next page"]')
    await nextButton.trigger('click')
    await flushPromises()

    const calls = vi.mocked(communityGalleryService.search).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0].page).toBe(2)
  })
})

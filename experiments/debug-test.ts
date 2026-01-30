import { ExtendedSearchEngine, DEFAULT_SEARCH_OPTIONS } from '../src/lib/extended-search'
import { componentMetaRegistry, registerComponentMeta, type ComponentMeta } from '../src/types/component-meta'

const mockComponent: ComponentMeta = {
  id: 'cube-preview',
  name: 'CubePreview',
  version: '2.1.0',
  summary: 'Interactive 3D preview component for parametric cubes',
  description: 'CubePreview provides real-time 3D rendering of parametric cubes with rotation and zoom controls.',
  phase: 1,
  filePath: 'components/CubePreview.tsx',
  history: [],
  features: [{ id: 'rotation', name: 'Rotation', description: 'Interactive cube rotation', enabled: true }],
  dependencies: [],
  relatedFiles: [],
  tags: ['3d', 'preview', 'cube', 'webgl', 'render'],
  status: 'stable',
  lastUpdated: '2024-02-01T00:00:00Z',
}

componentMetaRegistry.clear()
registerComponentMeta(mockComponent)

const engine = new ExtendedSearchEngine()

console.log('Index size:', engine.getIndexSize())

// Test 1: Search without options
console.log('\n--- Test 1: Search without options ---')
const results1 = engine.search('3d webgl')
console.log('Results length:', results1.length)
if (results1.length > 0) {
  console.log('matchedFields:', results1[0].matchedFields)
  console.log('fieldScores:', results1[0].fieldScores)
  console.log('score:', results1[0].score)
}

// Test 2: Search with default options
console.log('\n--- Test 2: Search with default searchFields ---')
const results2 = engine.search('3d webgl', undefined, { searchFields: DEFAULT_SEARCH_OPTIONS.searchFields })
console.log('Results length:', results2.length)
if (results2.length > 0) {
  console.log('matchedFields:', results2[0].matchedFields)
  console.log('fieldScores:', results2[0].fieldScores)
  console.log('score:', results2[0].score)
}

// Test 3: Search with tags only
console.log('\n--- Test 3: Search with searchFields: [tags] ---')
const results3 = engine.search('3d webgl', undefined, { searchFields: ['tags'] })
console.log('Results length:', results3.length)
if (results3.length > 0) {
  console.log('matchedFields:', results3[0].matchedFields)
  console.log('fieldScores:', results3[0].fieldScores)
  console.log('score:', results3[0].score)
}

// Test 4: Search with minScore: 0
console.log('\n--- Test 4: Search with minScore: 0 ---')
const results4 = engine.search('3d webgl', undefined, { searchFields: ['tags'], minScore: 0 })
console.log('Results length:', results4.length)
if (results4.length > 0) {
  console.log('matchedFields:', results4[0].matchedFields)
  console.log('fieldScores:', results4[0].fieldScores)
  console.log('score:', results4[0].score)
}

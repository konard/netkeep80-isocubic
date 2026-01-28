import { useState, useCallback, useEffect } from 'react'
import './App.css'
import { Gallery } from './components/Gallery'
import { ExportPanel } from './components/ExportPanel'
import { ParamEditor } from './components/ParamEditor'
import { CubePreview } from './components/CubePreview'
import type { SpectralCube } from './types/cube'
import { createDefaultCube } from './types/cube'

/** Mobile navigation tabs */
type MobileTab = 'gallery' | 'preview' | 'editor' | 'tools'

/** Breakpoint for mobile detection */
const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

/** Hook to detect device type based on viewport width */
function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop'
    const width = window.innerWidth
    if (width < MOBILE_BREAKPOINT) return 'mobile'
    if (width < TABLET_BREAKPOINT) return 'tablet'
    return 'desktop'
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < MOBILE_BREAKPOINT) {
        setDeviceType('mobile')
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return deviceType
}

function App() {
  // Current cube state
  const [currentCube, setCurrentCube] = useState<SpectralCube | null>(() =>
    createDefaultCube('default_cube')
  )

  // Mobile navigation state
  const [activeTab, setActiveTab] = useState<MobileTab>('gallery')
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  // Handle cube selection from gallery
  const handleCubeSelect = useCallback((cube: SpectralCube) => {
    setCurrentCube(cube)
  }, [])

  // Handle cube load from export panel
  const handleCubeLoad = useCallback((cube: SpectralCube) => {
    setCurrentCube(cube)
  }, [])

  // Handle cube change from undo/redo
  const handleCubeChange = useCallback((cube: SpectralCube) => {
    setCurrentCube(cube)
  }, [])

  // Handle cube update from ParamEditor
  const handleCubeUpdate = useCallback((cube: SpectralCube) => {
    setCurrentCube(cube)
  }, [])

  // Mobile swipe handling for tab navigation
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const tabs: MobileTab[] = ['gallery', 'preview', 'editor', 'tools']
      const currentIndex = tabs.indexOf(activeTab)

      if (direction === 'left' && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      } else if (direction === 'right' && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1])
      }
    },
    [activeTab]
  )

  // Touch swipe detection
  useEffect(() => {
    if (!isMobile) return

    let touchStartX = 0
    let touchEndX = 0
    const minSwipeDistance = 50

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX
      const distance = touchEndX - touchStartX

      if (Math.abs(distance) > minSwipeDistance) {
        handleSwipe(distance > 0 ? 'right' : 'left')
      }
    }

    const mainContent = document.querySelector('.app__mobile-content')
    if (mainContent) {
      mainContent.addEventListener('touchstart', handleTouchStart as EventListener)
      mainContent.addEventListener('touchend', handleTouchEnd as EventListener)

      return () => {
        mainContent.removeEventListener('touchstart', handleTouchStart as EventListener)
        mainContent.removeEventListener('touchend', handleTouchEnd as EventListener)
      }
    }
  }, [isMobile, handleSwipe])

  // Render mobile layout with tabs
  if (isMobile) {
    return (
      <div className="app app--mobile">
        <header className="app__header app__header--mobile">
          <h1>isocubic</h1>
        </header>

        {/* Mobile tab navigation */}
        <nav className="app__mobile-nav">
          <button
            type="button"
            className={`app__mobile-tab ${activeTab === 'gallery' ? 'app__mobile-tab--active' : ''}`}
            onClick={() => setActiveTab('gallery')}
            aria-selected={activeTab === 'gallery'}
          >
            <span className="app__mobile-tab-icon">🎨</span>
            <span className="app__mobile-tab-label">Gallery</span>
          </button>
          <button
            type="button"
            className={`app__mobile-tab ${activeTab === 'preview' ? 'app__mobile-tab--active' : ''}`}
            onClick={() => setActiveTab('preview')}
            aria-selected={activeTab === 'preview'}
          >
            <span className="app__mobile-tab-icon">👁️</span>
            <span className="app__mobile-tab-label">Preview</span>
          </button>
          <button
            type="button"
            className={`app__mobile-tab ${activeTab === 'editor' ? 'app__mobile-tab--active' : ''}`}
            onClick={() => setActiveTab('editor')}
            aria-selected={activeTab === 'editor'}
          >
            <span className="app__mobile-tab-icon">🎛️</span>
            <span className="app__mobile-tab-label">Editor</span>
          </button>
          <button
            type="button"
            className={`app__mobile-tab ${activeTab === 'tools' ? 'app__mobile-tab--active' : ''}`}
            onClick={() => setActiveTab('tools')}
            aria-selected={activeTab === 'tools'}
          >
            <span className="app__mobile-tab-icon">⚙️</span>
            <span className="app__mobile-tab-label">Tools</span>
          </button>
        </nav>

        {/* Mobile content panels */}
        <main className="app__mobile-content">
          {activeTab === 'gallery' && (
            <section className="app__mobile-panel">
              <Gallery onCubeSelect={handleCubeSelect} currentCube={currentCube} />
            </section>
          )}

          {activeTab === 'preview' && (
            <section className="app__mobile-panel app__mobile-panel--preview">
              <div className="app__current-cube app__current-cube--mobile">
                <h3 className="app__section-title">Current Cube</h3>
                {currentCube && (
                  <div className="app__cube-info">
                    <p>
                      <strong>Name:</strong> {currentCube.meta?.name || currentCube.id}
                    </p>
                    <p>
                      <strong>Material:</strong> {currentCube.physics?.material || 'Unknown'}
                    </p>
                    <p>
                      <strong>Tags:</strong> {currentCube.meta?.tags?.join(', ') || 'None'}
                    </p>
                  </div>
                )}
              </div>
              {/* 3D preview with interactive controls */}
              <div className="app__3d-preview app__3d-preview--mobile">
                <CubePreview
                  config={currentCube}
                  showGrid={true}
                  animate={false}
                  showShadows={true}
                />
                <p className="app__preview-hint">Use touch gestures to rotate and zoom</p>
              </div>
            </section>
          )}

          {activeTab === 'editor' && (
            <section className="app__mobile-panel">
              <ParamEditor currentCube={currentCube} onCubeUpdate={handleCubeUpdate} />
            </section>
          )}

          {activeTab === 'tools' && (
            <section className="app__mobile-panel">
              <ExportPanel
                currentCube={currentCube}
                onCubeLoad={handleCubeLoad}
                onCubeChange={handleCubeChange}
              />
            </section>
          )}
        </main>

        {/* Swipe indicator */}
        <div className="app__swipe-indicator">
          <span>Swipe to navigate</span>
        </div>
      </div>
    )
  }

  // Render tablet layout (vertical stack)
  if (deviceType === 'tablet') {
    return (
      <div className="app app--tablet">
        <header className="app__header">
          <h1>isocubic</h1>
          <p>Web editor for parametric cubes</p>
        </header>

        <main className="app__main app__main--tablet">
          {/* Preview area at top */}
          <section className="app__preview-section">
            <div className="app__3d-preview app__3d-preview--tablet">
              <CubePreview
                config={currentCube}
                showGrid={true}
                animate={false}
                showShadows={true}
              />
            </div>
            <div className="app__current-cube">
              <h3 className="app__section-title">Current Cube</h3>
              {currentCube && (
                <div className="app__cube-info">
                  <p>
                    <strong>Name:</strong> {currentCube.meta?.name || currentCube.id}
                  </p>
                  <p>
                    <strong>Material:</strong> {currentCube.physics?.material || 'Unknown'}
                  </p>
                  <p>
                    <strong>Tags:</strong> {currentCube.meta?.tags?.join(', ') || 'None'}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Gallery and tools side by side */}
          <div className="app__tablet-panels">
            <section className="app__section">
              <Gallery onCubeSelect={handleCubeSelect} currentCube={currentCube} />
            </section>

            <section className="app__section app__section--sidebar">
              <ParamEditor currentCube={currentCube} onCubeUpdate={handleCubeUpdate} />
              <ExportPanel
                currentCube={currentCube}
                onCubeLoad={handleCubeLoad}
                onCubeChange={handleCubeChange}
              />
            </section>
          </div>
        </main>
      </div>
    )
  }

  // Render desktop layout (original - 3D preview left, editor right)
  return (
    <div className="app app--desktop">
      <header className="app__header">
        <h1>isocubic</h1>
        <p>Web editor for parametric cubes</p>
      </header>

      <main className="app__main">
        {/* Left side: 3D preview and Gallery */}
        <section className="app__section app__section--main">
          <div className="app__3d-preview app__3d-preview--desktop">
            <CubePreview config={currentCube} showGrid={true} animate={false} showShadows={true} />
          </div>
          <Gallery onCubeSelect={handleCubeSelect} currentCube={currentCube} />
        </section>

        {/* Right side: Parameter editor and tools */}
        <section className="app__section app__section--sidebar">
          <ParamEditor currentCube={currentCube} onCubeUpdate={handleCubeUpdate} />
          <ExportPanel
            currentCube={currentCube}
            onCubeLoad={handleCubeLoad}
            onCubeChange={handleCubeChange}
          />
        </section>
      </main>
    </div>
  )
}

export default App

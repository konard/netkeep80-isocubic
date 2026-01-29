/**
 * isocubic collaboration server
 * Entry point for the WebSocket and REST API server
 */

import { DEFAULT_SERVER_CONFIG } from './types.js'
import type { ServerConfig } from './types.js'
import { createSessionStore } from './session-store.js'
import { createAuthManager } from './auth.js'
import { createWebSocketServer } from './websocket-server.js'
import { createHttpServer } from './http-server.js'

// Re-export types and factories for library usage
export * from './types.js'
export * from './session-store.js'
export * from './auth.js'
export * from './websocket-server.js'
export * from './http-server.js'

/**
 * Creates and starts the isocubic collaboration server
 */
export async function startServer(config?: Partial<ServerConfig>): Promise<{
  stop: () => Promise<void>
  config: ServerConfig
}> {
  const finalConfig: ServerConfig = {
    ...DEFAULT_SERVER_CONFIG,
    ...config,
    // Environment variable overrides
    port: parseInt(process.env['PORT'] || String(config?.port ?? DEFAULT_SERVER_CONFIG.port), 10),
    host: process.env['HOST'] || config?.host || DEFAULT_SERVER_CONFIG.host,
    jwtSecret: process.env['JWT_SECRET'] || config?.jwtSecret || DEFAULT_SERVER_CONFIG.jwtSecret,
    debug: process.env['DEBUG'] === 'true' || config?.debug || DEFAULT_SERVER_CONFIG.debug,
  }

  // Warn about default JWT secret in production
  if (
    process.env['NODE_ENV'] === 'production' &&
    finalConfig.jwtSecret === DEFAULT_SERVER_CONFIG.jwtSecret
  ) {
    console.warn(
      'WARNING: Using default JWT secret in production. Set JWT_SECRET environment variable.'
    )
  }

  console.log('Starting isocubic server...')
  console.log(`Environment: ${process.env['NODE_ENV'] || 'development'}`)
  console.log(`Debug mode: ${finalConfig.debug}`)

  // Create components
  const sessionStore = createSessionStore(finalConfig)
  const authManager = createAuthManager(finalConfig)
  const wsServer = createWebSocketServer(finalConfig, sessionStore, authManager)
  const httpServer = createHttpServer(finalConfig, sessionStore, authManager)

  // Connect WebSocket server to HTTP server
  httpServer.setWebSocketServer(wsServer)

  // Start HTTP server
  await httpServer.start()

  console.log('isocubic server started successfully')

  return {
    stop: () => httpServer.stop(),
    config: finalConfig,
  }
}

// Run server if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}

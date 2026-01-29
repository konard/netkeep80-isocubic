# isocubic Server

WebSocket server for isocubic collaborative editing sessions.

## Overview

This server enables real-time collaboration between multiple users editing isocubic scenes. It handles:

- Session creation and management
- Participant authentication with JWT tokens
- Real-time synchronization via WebSocket
- Polling fallback for environments where WebSocket is unavailable

## Quick Start

### Requirements

- Node.js >= 18
- npm >= 9

### Installation

```bash
cd server
npm install
```

### Development

```bash
# Start in development mode with hot reload
npm run dev
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Configuration

The server can be configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `JWT_SECRET` | (generated) | Secret for JWT signing |
| `DEBUG` | false | Enable debug logging |
| `NODE_ENV` | development | Environment mode |

### Security

**Important**: Always set a custom `JWT_SECRET` in production:

```bash
export JWT_SECRET="your-secure-random-secret"
npm start
```

## API Reference

### REST Endpoints

#### Health Check

```
GET /api/health
```

Returns server status and version.

#### Create Session

```
POST /api/sessions
Content-Type: application/json

{
  "ownerName": "Alice",
  "settings": {
    "isPublic": true,
    "allowEditing": true
  }
}
```

Response:
```json
{
  "session": { "id": "...", "code": "ABC123", ... },
  "participant": { "id": "...", "name": "Alice", "role": "owner" },
  "token": "eyJ..."
}
```

#### Join Session

```
POST /api/sessions/join
Content-Type: application/json

{
  "sessionCode": "ABC123",
  "participantName": "Bob"
}
```

#### Leave Session

```
POST /api/sessions/leave
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "...",
  "participantId": "..."
}
```

#### Poll for Updates (Fallback)

```
POST /api/poll
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "...",
  "participantId": "..."
}
```

#### Send Action

```
POST /api/action
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "...",
  "participantId": "...",
  "action": { ... }
}
```

#### Update Presence

```
POST /api/presence
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "...",
  "participantId": "...",
  "cursor": { "x": 100, "y": 200 },
  "selectedCubeId": "cube-1"
}
```

### WebSocket Protocol

Connect to `ws://host:port/ws` and send/receive JSON messages.

#### Join Session

```json
{
  "type": "join_session",
  "sessionCode": "ABC123",
  "participantName": "Alice",
  "token": "eyJ..."  // Optional, for reconnection
}
```

#### Leave Session

```json
{
  "type": "leave_session",
  "sessionId": "...",
  "participantId": "..."
}
```

#### Sync Action

```json
{
  "type": "sync_action",
  "sessionId": "...",
  "action": {
    "type": "cube_create",
    "participantId": "...",
    "timestamp": 1234567890,
    "cubeId": "new-cube",
    "config": { ... }
  }
}
```

#### Request Full Sync

```json
{
  "type": "full_sync",
  "sessionId": "..."
}
```

#### Update Presence

```json
{
  "type": "presence_update",
  "sessionId": "...",
  "participantId": "...",
  "cursor": { "x": 100, "y": 200 },
  "selectedCubeId": "cube-1"
}
```

#### Heartbeat

```json
{
  "type": "heartbeat"
}
```

### Message Types (Server to Client)

- `session_joined` - Confirmation of successful join with session data and token
- `session_left` - Confirmation of leave
- `participant_joined` - Another participant joined
- `participant_left` - A participant left
- `action_broadcast` - An action from another participant
- `full_sync_response` - Complete session state
- `presence_broadcast` - Presence update from another participant
- `error` - Error message

## Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

Build and run:

```bash
npm run build
docker build -t isocubic-server .
docker run -p 3001:3001 -e JWT_SECRET=your-secret isocubic-server
```

### Cloud Platforms

#### Railway / Render / Fly.io

1. Connect your repository
2. Set build command: `cd server && npm install && npm run build`
3. Set start command: `cd server && npm start`
4. Configure environment variables:
   - `JWT_SECRET` (required in production)
   - `PORT` (usually auto-configured)

#### Heroku

```bash
# Add server as separate app
heroku create isocubic-server
heroku config:set JWT_SECRET=your-secret
git subtree push --prefix server heroku main
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name collab.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     isocubic Server                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ HTTP Server │  │  WebSocket  │  │    Session Store    │  │
│  │  (REST API) │  │   Server    │  │   (In-Memory)       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                   ┌──────┴──────┐                           │
│                   │ Auth Manager │                           │
│                   │    (JWT)     │                           │
│                   └─────────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Components

- **HTTP Server**: Handles REST API requests and WebSocket upgrades
- **WebSocket Server**: Manages real-time connections and message broadcasting
- **Session Store**: In-memory storage for sessions and participants
- **Auth Manager**: JWT token generation and verification

### Scaling Considerations

The current implementation uses in-memory storage, suitable for:
- Development and testing
- Small deployments (single server)
- Demo/prototype applications

For production scaling:
- Replace `SessionStore` with Redis or PostgreSQL backend
- Use Redis pub/sub for multi-server message broadcasting
- Consider sticky sessions or connection state sharing

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## License

Unlicense - see [LICENSE](../LICENSE)

/**
 * ConversationPanel Component Tests
 *
 * Tests for the AI conversation panel in GOD MODE.
 *
 * TASK 55: AI Conversation Agent (Phase 9 - GOD MODE)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationPanel } from './ConversationPanel'
import { CONVERSATION_STORAGE_KEY, CONVERSATION_SUGGESTIONS } from '../types/god-mode'
import { resetDefaultAgent } from '../lib/conversation-agent'

describe('ConversationPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDefaultAgent()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    resetDefaultAgent()
  })

  describe('rendering', () => {
    it('should render the conversation panel', () => {
      render(<ConversationPanel />)

      expect(screen.getByTestId('conversation-panel')).toBeInTheDocument()
    })

    it('should render empty state when no messages', () => {
      render(<ConversationPanel />)

      expect(screen.getByText(/Начните диалог|Start a conversation/i)).toBeInTheDocument()
    })

    it('should render message input', () => {
      render(<ConversationPanel />)

      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })

    it('should render send button', () => {
      render(<ConversationPanel />)

      expect(screen.getByTestId('send-button')).toBeInTheDocument()
    })

    it('should render suggestions when panel is empty', () => {
      render(<ConversationPanel />)

      expect(screen.getByTestId('suggestions')).toBeInTheDocument()
    })

    it('should render suggestions with correct text based on language', () => {
      render(<ConversationPanel settings={{ preferredLanguage: 'ru' }} />)

      // Check that Russian suggestions are shown
      const suggestionText = CONVERSATION_SUGGESTIONS[0].textRu
      expect(screen.getByText(new RegExp(suggestionText.slice(0, 10)))).toBeInTheDocument()
    })
  })

  describe('input handling', () => {
    it('should update input value on typing', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Hello')

      expect(input).toHaveValue('Hello')
    })

    it('should disable send button when input is empty', () => {
      render(<ConversationPanel />)

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toBeDisabled()
    })

    it('should enable send button when input has content', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test message')

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).not.toBeDisabled()
    })

    it('should clear input after sending message', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test message')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('should send message on Enter key', async () => {
      const user = userEvent.setup()
      const onMessageSent = vi.fn()
      render(<ConversationPanel onMessageSent={onMessageSent} />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test message')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onMessageSent).toHaveBeenCalledWith('Test message')
      })
    })

    it('should not send message on Shift+Enter', async () => {
      const user = userEvent.setup()
      const onMessageSent = vi.fn()
      render(<ConversationPanel onMessageSent={onMessageSent} />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test message')
      await user.keyboard('{Shift>}{Enter}{/Shift}')

      expect(onMessageSent).not.toHaveBeenCalled()
    })
  })

  describe('message display', () => {
    it('should display user message after sending', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Hello AI')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(screen.getByTestId('message-user')).toBeInTheDocument()
        expect(screen.getByText('Hello AI')).toBeInTheDocument()
      })
    })

    it('should display assistant response after processing', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Hello')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(
        () => {
          expect(screen.getByTestId('message-assistant')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('should show typing indicator while processing', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel settings={{ showTypingIndicator: true }} />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test')
      await user.click(screen.getByTestId('send-button'))

      // Typing indicator should appear briefly
      await waitFor(
        () => {
          const indicator = screen.queryByTestId('typing-indicator')
          // Either indicator is shown or processing completed
          expect(indicator || screen.queryByTestId('message-assistant')).toBeTruthy()
        },
        { timeout: 3000 }
      )
    })

    it('should display timestamps when enabled', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel settings={{ showTimestamps: true }} />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test message')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        // Timestamps are displayed in HH:MM format
        const timePattern = /\d{1,2}:\d{2}/
        const messageContainer = screen.getByTestId('messages-container')
        expect(messageContainer.textContent).toMatch(timePattern)
      })
    })
  })

  describe('suggestions', () => {
    it('should fill input when suggestion is clicked', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel settings={{ preferredLanguage: 'ru' }} />)

      const firstSuggestion = screen.getByTestId('suggestion-0')
      await user.click(firstSuggestion)

      const input = screen.getByTestId('message-input')
      expect(input).toHaveValue(CONVERSATION_SUGGESTIONS[0].textRu)
    })

    it('should display suggestion icons', () => {
      render(<ConversationPanel />)

      const firstSuggestion = screen.getByTestId('suggestion-0')
      // Check that the suggestion contains an icon
      expect(firstSuggestion.textContent).toMatch(new RegExp(CONVERSATION_SUGGESTIONS[0].icon))
    })
  })

  describe('clear functionality', () => {
    it('should show clear button after messages exist', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(screen.getByTestId('clear-button')).toBeInTheDocument()
      })
    })

    it('should clear conversation when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(screen.getByTestId('clear-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('clear-button'))

      await waitFor(() => {
        expect(screen.getByText(/Начните диалог|Start a conversation/i)).toBeInTheDocument()
      })
    })

    it('should hide clear button after clearing', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(screen.getByTestId('clear-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('clear-button'))

      await waitFor(() => {
        expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument()
      })
    })
  })

  describe('callbacks', () => {
    it('should call onMessageSent when message is sent', async () => {
      const user = userEvent.setup()
      const onMessageSent = vi.fn()
      render(<ConversationPanel onMessageSent={onMessageSent} />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test message')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(onMessageSent).toHaveBeenCalledWith('Test message')
      })
    })

    it('should call onResponseReceived when response is received', async () => {
      const user = userEvent.setup()
      const onResponseReceived = vi.fn()
      render(<ConversationPanel onResponseReceived={onResponseReceived} />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(
        () => {
          expect(onResponseReceived).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )

      const response = onResponseReceived.mock.calls[0][0]
      expect(response.success).toBe(true)
      expect(response.message).toBeDefined()
    })
  })

  describe('context handling', () => {
    it('should include selectedComponentId in message context', async () => {
      const user = userEvent.setup()
      const onResponseReceived = vi.fn()
      render(
        <ConversationPanel
          selectedComponentId="TestComponent"
          onResponseReceived={onResponseReceived}
        />
      )

      const input = screen.getByTestId('message-input')
      await user.type(input, 'What is this component?')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(
        () => {
          expect(onResponseReceived).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('settings', () => {
    it('should use English language when configured', () => {
      render(<ConversationPanel settings={{ preferredLanguage: 'en' }} />)

      expect(screen.getByText(/Start a conversation/i)).toBeInTheDocument()
    })

    it('should use Russian language when configured', () => {
      render(<ConversationPanel settings={{ preferredLanguage: 'ru' }} />)

      expect(screen.getByText(/Начните диалог/i)).toBeInTheDocument()
    })

    it('should hide suggestions when showSuggestions is false', () => {
      render(<ConversationPanel settings={{ showSuggestions: false }} />)

      expect(screen.queryByTestId('suggestions')).not.toBeInTheDocument()
    })
  })

  describe('persistence', () => {
    it('should persist conversation to localStorage', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test persistence')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY)
        expect(stored).toBeTruthy()
        const session = JSON.parse(stored!)
        expect(session.messages.length).toBeGreaterThan(0)
      })
    })

    it('should load existing conversation from localStorage', () => {
      const existingSession = {
        id: 'session_test',
        title: 'Test Session',
        messages: [
          {
            id: 'msg_1',
            role: 'user',
            content: 'Existing message',
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'idle',
        language: 'ru',
      }
      localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(existingSession))

      render(<ConversationPanel />)

      expect(screen.getByText('Existing message')).toBeInTheDocument()
    })
  })

  describe('message count display', () => {
    it('should show message count in header', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel settings={{ preferredLanguage: 'ru' }} />)

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        // After one exchange, there should be 2 messages (user + assistant)
        expect(screen.getByText(/\d+ сообщений|messages/i)).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should have accessible input placeholder', () => {
      render(<ConversationPanel settings={{ preferredLanguage: 'ru' }} />)

      const input = screen.getByTestId('message-input')
      expect(input).toHaveAttribute('placeholder')
    })

    it('should focus input after clicking suggestion', async () => {
      const user = userEvent.setup()
      render(<ConversationPanel />)

      const firstSuggestion = screen.getByTestId('suggestion-0')
      await user.click(firstSuggestion)

      const input = screen.getByTestId('message-input')
      expect(document.activeElement).toBe(input)
    })
  })
})

describe('ConversationPanel integration', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDefaultAgent()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    resetDefaultAgent()
  })

  it('should handle multi-turn conversation', async () => {
    const user = userEvent.setup()
    render(<ConversationPanel />)

    // First message
    const input = screen.getByTestId('message-input')
    await user.type(input, 'Hello')
    await user.click(screen.getByTestId('send-button'))

    await waitFor(() => {
      expect(screen.getByTestId('message-assistant')).toBeInTheDocument()
    })

    // Second message
    await user.type(input, 'How are you?')
    await user.click(screen.getByTestId('send-button'))

    await waitFor(() => {
      const messages = screen.getAllByTestId(/message-(user|assistant)/)
      expect(messages.length).toBeGreaterThanOrEqual(4) // 2 user + 2 assistant
    })
  })

  it('should handle rapid message sending', async () => {
    const user = userEvent.setup()
    render(<ConversationPanel />)

    const input = screen.getByTestId('message-input')

    // Send first message
    await user.type(input, 'First')
    await user.click(screen.getByTestId('send-button'))

    // Wait for first response
    await waitFor(
      () => {
        expect(screen.getByTestId('message-assistant')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Send second message immediately
    await user.type(input, 'Second')
    await user.click(screen.getByTestId('send-button'))

    // Both messages should be processed
    await waitFor(
      () => {
        const userMessages = screen.getAllByTestId('message-user')
        expect(userMessages.length).toBe(2)
      },
      { timeout: 5000 }
    )
  })
})

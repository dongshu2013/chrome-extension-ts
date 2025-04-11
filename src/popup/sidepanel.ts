interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

class ChatUI {
  private chats: Chat[] = [];
  private currentChat: Chat | null = null;
  private chatListOverlay: HTMLElement | null = null;
  private editTitleModal: HTMLElement | null = null;
  private deleteModal: HTMLElement | null = null;
  private chatToDelete: string | null = null;
  private abortController: AbortController | null = null;
  private readonly defaultModel = 'gemini-2.5-pro';

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.loadChats();
  }

  private initializeElements() {
    this.chatListOverlay = document.getElementById('chat-list-overlay');
    this.deleteModal = document.getElementById('delete-modal');
    this.editTitleModal = document.getElementById('edit-title-modal');
  }

  private async loadChats() {
    const result = await new Promise<{ chats?: Chat[] }>((resolve) => {
      chrome.storage.local.get(['chats'], (data) => {
        resolve(data || { chats: [] });
      });
    });

    this.chats = result.chats || [];

    // Initialize model selection
    // Removed model selection initialization

    this.renderChatList();
    
    // If no chats exist, create a new one
    if (this.chats.length === 0) {
      this.createNewChat();
    } else {
      // Load the first chat
      this.currentChat = this.chats[0];
      this.renderMessages();
      
      // Update title
      const chatTitle = document.getElementById('current-chat-title');
      if (chatTitle) chatTitle.textContent = this.currentChat.title;
    }
  }

  private setupEventListeners() {
    // Show chats overlay
    document.getElementById('show-chats')?.addEventListener('click', () => {
      this.chatListOverlay?.classList.remove('-translate-x-full');
    });

    // Hide chats overlay
    document.getElementById('close-chats')?.addEventListener('click', () => {
      this.chatListOverlay?.classList.add('-translate-x-full');
    });

    // New chat button in chat list
    document.getElementById('new-chat')?.addEventListener('click', () => {
      this.createNewChat();
      this.chatListOverlay?.classList.add('-translate-x-full');
    });

    // Edit title
    document.getElementById('current-chat-title')?.addEventListener('click', () => {
      if (this.currentChat) {
        const input = document.getElementById('edit-title-input') as HTMLInputElement;
        input.value = this.currentChat.title;
        this.editTitleModal?.classList.add('show');
      }
    });

    // Save title
    document.getElementById('save-title')?.addEventListener('click', () => {
      const input = document.getElementById('edit-title-input') as HTMLInputElement;
      const newTitle = input.value.trim();
      if (newTitle && this.currentChat) {
        this.currentChat.title = newTitle;
        document.getElementById('current-chat-title')!.textContent = newTitle;
        this.saveChats();
        this.renderChatList();
        this.editTitleModal?.classList.remove('show');
      }
    });

    // Cancel title edit
    document.getElementById('cancel-edit-title')?.addEventListener('click', () => {
      this.editTitleModal?.classList.remove('show');
    });

    // Delete confirmation
    document.getElementById('confirm-delete')?.addEventListener('click', () => {
      if (this.chatToDelete) {
        this.deleteChat(this.chatToDelete);
        this.deleteModal?.classList.remove('show');
        this.chatToDelete = null;
      }
    });

    // Cancel delete
    document.getElementById('cancel-delete')?.addEventListener('click', () => {
      this.deleteModal?.classList.remove('show');
      this.chatToDelete = null;
    });

    // Cancel request button
    const cancelRequestButton = document.getElementById('cancel-request');
    cancelRequestButton?.addEventListener('click', () => {
      this.cancelStreamingRequest();
    });

    // Send message on enter key
    const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
    messageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!this.isStreamingResponse()) {
          this.sendMessage();
        }
      }
    });

    // Model selection event listener removed
  }

  private isStreamingResponse(): boolean {
    return this.abortController !== null;
  }

  private cancelStreamingRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      
      // Hide cancel button
      const cancelRequestButton = document.getElementById('cancel-request');
      cancelRequestButton?.classList.add('hidden');
      
      // Re-enable message input
      const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
      messageInput.disabled = false;
    }
  }

  private async createNewChat() {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      model: this.defaultModel
    };

    // Retrieve existing chats
    const result = await new Promise<{ chats?: Chat[] }>((resolve) => {
      chrome.storage.local.get(['chats'], (data) => {
        resolve(data || { chats: [] });
      });
    });

    const chats = result.chats || [];
    chats.unshift(newChat);

    // Save updated chats
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ chats }, () => {
        resolve();
      });
    });

    // Update current chat and render
    this.currentChat = newChat;
    this.renderChatList();
    this.renderMessages();
    
    // Update title
    const chatTitle = document.getElementById('current-chat-title');
    if (chatTitle) chatTitle.textContent = newChat.title;
  }

  private deleteChat(chatId: string) {
    const index = this.chats.findIndex(c => c.id === chatId);
    if (index === -1) return;

    this.chats.splice(index, 1);
    this.saveChats();

    // If we deleted the current chat, switch to another one
    if (this.currentChat?.id === chatId) {
      if (this.chats.length > 0) {
        this.setCurrentChat(this.chats[0]);
      } else {
        this.createNewChat();
      }
    }

    this.renderChatList();
  }

  private setCurrentChat(chat: Chat) {
    this.currentChat = chat;
    const titleElement = document.getElementById('current-chat-title');
    if (titleElement) {
      titleElement.textContent = chat.title;
    }
    this.renderMessages();
  }

  private renderChatList() {
    const chatList = document.getElementById('chat-list');
    if (!chatList) return;

    chatList.innerHTML = this.chats.map(chat => `
      <div class="chat-item p-4 hover:bg-gray-100 cursor-pointer flex items-center justify-between ${
        chat.id === this.currentChat?.id ? 'bg-blue-50' : ''
      }" data-chat-id="${chat.id}">
        <div class="flex-1">
          <h3 class="font-medium">${chat.title}</h3>
          <p class="text-sm text-gray-500">${chat.messages.length} messages</p>
        </div>
        <button class="delete-chat text-gray-400 hover:text-red-500 p-1" data-chat-id="${chat.id}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `).join('');

    // Add click handlers for chat items
    chatList.querySelectorAll('.chat-item').forEach(item => {
      // Delete button click
      const deleteBtn = item.querySelector('.delete-chat');
      deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent chat selection
        const chatId = (e.currentTarget as HTMLElement).getAttribute('data-chat-id');
        if (chatId) {
          this.chatToDelete = chatId;
          this.deleteModal?.classList.add('show');
        }
      });

      // Chat selection click
      item.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.delete-chat')) {
          const chatId = item.getAttribute('data-chat-id');
          const chat = this.chats.find(c => c.id === chatId);
          if (chat) {
            this.setCurrentChat(chat);
            this.chatListOverlay?.classList.add('-translate-x-full');
          }
        }
      });
    });
  }

  private renderMessages() {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer || !this.currentChat) return;

    messagesContainer.innerHTML = this.currentChat.messages.map(msg => `
      <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2">
        <div class="message-bubble ${msg.role === 'user' ? 'user-message' : 'ai-message'}">
          ${msg.content}
        </div>
      </div>
    `).join('');

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  private async sendMessage() {
    const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
    const message = messageInput.value.trim();
    
    if (!message) return;

    // Disable input and show cancel button during streaming
    messageInput.disabled = true;
    const cancelRequestButton = document.getElementById('cancel-request');
    cancelRequestButton?.classList.remove('hidden');

    // Create a new AbortController for this request
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Add user message to chat
      if (!this.currentChat) {
        await this.createNewChat();
      }

      const userMessage: Message = {
        role: 'user',
        content: message
      };
      this.currentChat!.messages.push(userMessage);
      this.renderMessages();

      // Clear input
      messageInput.value = '';

      // Use default model (Gemini 2.5 Pro)
      const model = this.defaultModel;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: this.currentChat!.messages,
          stream: true
        }),
        signal
      });

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      
      while (true) {
        const { done, value } = await reader?.read()!;
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            
            try {
              const parsedChunk = JSON.parse(jsonStr);
              const content = parsedChunk.choices[0]?.delta?.content || '';
              
              if (content) {
                assistantMessage += content;
                this.renderStreamingMessage(assistantMessage);
              }
            } catch (parseError) {
              console.error('Error parsing chunk:', parseError);
            }
          }
        }
      }

      // Add full assistant message
      const assistantMessageObj: Message = {
        role: 'assistant',
        content: assistantMessage
      };
      this.currentChat!.messages.push(assistantMessageObj);
      
      // Remove streaming indicator and finalize message
      this.finalizeStreamingMessage(assistantMessage);
      
      this.saveChats();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled');
        // Remove streaming message if cancelled
        this.removeStreamingMessage();
      } else {
        console.error('Error sending message:', error);
      }
    } finally {
      // Reset streaming state
      this.abortController = null;
      messageInput.disabled = false;
      cancelRequestButton?.classList.add('hidden');
    }
  }

  private finalizeStreamingMessage(content: string) {
    const messagesContainer = document.getElementById('messages');
    const streamingMessage = messagesContainer?.querySelector('.streaming-message');
    
    if (streamingMessage) {
      // Remove streaming indicator
      const indicator = streamingMessage.querySelector('.streaming-indicator');
      if (indicator) {
        indicator.remove();
      }
      
      // Remove streaming class
      streamingMessage.classList.remove('streaming-message');
    }
  }

  private removeStreamingMessage() {
    const messagesContainer = document.getElementById('messages');
    const streamingMessage = messagesContainer?.querySelector('.streaming-message');
    
    if (streamingMessage) {
      streamingMessage.remove();
    }
  }

  private renderStreamingMessage(content: string) {
    const messagesContainer = document.getElementById('messages');
    let streamingMessage = messagesContainer?.querySelector('.streaming-message');
    
    if (streamingMessage) {
      // Update existing streaming message
      const messageContent = streamingMessage.querySelector('.message-content');
      if (messageContent) {
        messageContent.textContent = content;
      }
    } else {
      // Create new streaming message
      streamingMessage = document.createElement('div');
      streamingMessage.classList.add('assistant-message', 'streaming-message');
      
      // Create message content
      const messageContent = document.createElement('div');
      messageContent.classList.add('message-content');
      messageContent.textContent = content;
      
      // Create streaming indicator
      const indicator = document.createElement('div');
      indicator.classList.add('streaming-indicator');
      
      // Add elements to message
      streamingMessage.appendChild(messageContent);
      streamingMessage.appendChild(indicator);
      
      // Add to messages container
      messagesContainer?.appendChild(streamingMessage);
    }
    
    // Scroll to bottom
    messagesContainer?.scrollTo(0, messagesContainer.scrollHeight);
  }

  private async saveChats() {
    await chrome.storage.local.set({ chats: this.chats });
  }
}

// Initialize the UI when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChatUI();
});

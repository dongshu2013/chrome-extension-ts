interface Chat {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  model: string;
}

class ChatUI {
  private chats: Chat[] = [];
  private currentChat: Chat | null = null;
  private chatListOverlay: HTMLElement | null = null;
  private deleteModal: HTMLElement | null = null;
  private editTitleModal: HTMLElement | null = null;
  private chatToDelete: string | null = null;

  constructor() {
    this.initializeElements();
    this.loadChats();
    this.setupEventListeners();
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
    this.initializeModelSelection();

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

  private async initializeModelSelection() {
    const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
    
    // Retrieve saved model from local storage
    chrome.storage.local.get(['selectedModel'], (result) => {
      // If no model saved, set default to Gemini 2.5 Pro
      const defaultModel = result.selectedModel || 'gemini-2.5-pro';
      modelSelect.value = defaultModel;
    });
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

    // Send message on enter key
    const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
    messageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Model selection
    const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
    modelSelect?.addEventListener('change', () => {
      const selectedModel = modelSelect.value;
      if (this.currentChat) {
        this.currentChat.model = selectedModel;
        this.saveChats();
      }
      
      // Persist model selection in local storage
      chrome.storage.local.set({ 
        selectedModel: selectedModel 
      });
    });
  }

  private async createNewChat() {
    const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
    const selectedModel = modelSelect.value || 'gemini-2.5-pro';

    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      model: selectedModel
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
    const content = messageInput.value.trim();
    
    if (!content || !this.currentChat) return;

    // Add user message
    this.currentChat.messages.push({
      role: 'user',
      content
    });

    // Clear input
    messageInput.value = '';

    // Update UI
    this.renderMessages();
    this.saveChats();

    // Update title if it's the first message
    if (this.currentChat.messages.length === 1) {
      this.currentChat.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
      document.getElementById('current-chat-title')!.textContent = this.currentChat.title;
      this.renderChatList();
    }

    // TODO: Send to AI service and handle response
    // For now, just echo back
    setTimeout(() => {
      if (this.currentChat) {
        this.currentChat.messages.push({
          role: 'assistant',
          content: `Echo: ${content}`
        });
        this.renderMessages();
        this.saveChats();
      }
    }, 1000);
  }

  private async saveChats() {
    await chrome.storage.local.set({ chats: this.chats });
  }
}

// Initialize the UI when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChatUI();
});

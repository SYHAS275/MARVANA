import { create } from 'zustand';
import { Chat, Message } from '../types';
import { saveData, loadData, KEYS } from '../services/storage';

interface ChatState {
  chats: Record<string, Chat>;
  messages: Record<string, Message[]>;
  streamingChatId: string | null;
  pinnedChatIds: string[];

  // Chat CRUD
  createChat: (chat: Chat) => void;
  getChat: (id: string) => Chat | undefined;
  getOrCreateIndividualChat: (characterId: string) => Chat;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  deleteChat: (id: string) => void;
  togglePin: (chatId: string) => void;

  // Messages
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  getMessages: (chatId: string) => Message[];
  addReaction: (chatId: string, messageId: string, emoji: string) => void;
  removeLastAIMessage: (chatId: string) => Message | undefined;

  // Streaming
  setStreaming: (chatId: string | null) => void;

  // Group
  muteCharacter: (chatId: string, characterId: string) => void;
  unmuteCharacter: (chatId: string, characterId: string) => void;

  // Persistence
  hydrate: () => Promise<void>;
  persist: () => void;

  // Sorted chats for display
  getSortedChats: () => Chat[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: {},
  messages: {},
  streamingChatId: null,
  pinnedChatIds: [],

  createChat: (chat: Chat) => {
    set((s) => ({
      chats: { ...s.chats, [chat.id]: chat },
      messages: { ...s.messages, [chat.id]: [] },
    }));
    get().persist();
  },

  getChat: (id: string) => get().chats[id],

  getOrCreateIndividualChat: (characterId: string) => {
    const existing = Object.values(get().chats).find(
      (c) => c.type === 'individual' && c.characterIds.includes(characterId)
    );
    if (existing) return existing;

    const chat: Chat = {
      id: `chat_${characterId}_${Date.now()}`,
      type: 'individual',
      characterIds: [characterId],
      title: characterId,
      mutedCharacters: [],
    };
    get().createChat(chat);
    return chat;
  },

  updateChat: (id: string, updates: Partial<Chat>) => {
    set((s) => ({
      chats: { ...s.chats, [id]: { ...s.chats[id], ...updates } },
    }));
    get().persist();
  },

  deleteChat: (id: string) => {
    set((s) => {
      const { [id]: _c, ...chats } = s.chats;
      const { [id]: _m, ...messages } = s.messages;
      return { chats, messages, pinnedChatIds: s.pinnedChatIds.filter((p) => p !== id) };
    });
    get().persist();
  },

  togglePin: (chatId: string) => {
    set((s) => ({
      pinnedChatIds: s.pinnedChatIds.includes(chatId)
        ? s.pinnedChatIds.filter((id) => id !== chatId)
        : [chatId, ...s.pinnedChatIds],
    }));
    get().persist();
  },

  addMessage: (chatId: string, message: Message) => {
    set((s) => {
      const existing = s.messages[chatId] || [];
      const isUserMsg = message.senderId === 'user';
      const chat = s.chats[chatId];
      return {
        messages: { ...s.messages, [chatId]: [...existing, message] },
        chats: {
          ...s.chats,
          [chatId]: chat
            ? {
                ...chat,
                lastMessage: message.content.slice(0, 50),
                lastMessageTime: message.timestamp,
                messageCount: isUserMsg ? (chat.messageCount || 0) + 1 : (chat.messageCount || 0),
              }
            : chat,
        },
      };
    });
    get().persist();
  },

  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => {
    set((s) => {
      const msgs = s.messages[chatId] || [];
      const nextMsgs = msgs.map((m) => (m.id === messageId ? { ...m, ...updates } : m));
      const updatedMsg = nextMsgs.find((m) => m.id === messageId);
      const lastMsg = nextMsgs[nextMsgs.length - 1];
      const shouldRefreshPreview = updatedMsg && lastMsg && updatedMsg.id === lastMsg.id;

      return {
        messages: {
          ...s.messages,
          [chatId]: nextMsgs,
        },
        chats: shouldRefreshPreview && s.chats[chatId]
          ? {
              ...s.chats,
              [chatId]: {
                ...s.chats[chatId],
                lastMessage: (lastMsg.content || '').slice(0, 50),
                lastMessageTime: lastMsg.timestamp,
              },
            }
          : s.chats,
      };
    });
    get().persist();
  },

  getMessages: (chatId: string) => get().messages[chatId] || [],

  addReaction: (chatId: string, messageId: string, emoji: string) => {
    set((s) => {
      const msgs = s.messages[chatId] || [];
      return {
        messages: {
          ...s.messages,
          [chatId]: msgs.map((m) =>
            m.id === messageId
              ? { ...m, reactions: [...m.reactions, { emoji, userId: 'user' }] }
              : m
          ),
        },
      };
    });
    get().persist();
  },

  removeLastAIMessage: (chatId: string) => {
    const msgs = get().messages[chatId] || [];
    const lastAI = [...msgs].reverse().find((m) => m.senderId !== 'user');
    if (lastAI) {
      const nextMsgs = msgs.filter((m) => m.id !== lastAI.id);
      const newLast = nextMsgs[nextMsgs.length - 1];
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: nextMsgs,
        },
        chats: s.chats[chatId]
          ? {
              ...s.chats,
              [chatId]: {
                ...s.chats[chatId],
                lastMessage: newLast?.content?.slice(0, 50) || '',
                lastMessageTime: newLast?.timestamp,
              },
            }
          : s.chats,
      }));
      get().persist();
    }
    return lastAI;
  },

  setStreaming: (chatId: string | null) => set({ streamingChatId: chatId }),

  muteCharacter: (chatId: string, characterId: string) => {
    const chat = get().chats[chatId];
    if (chat) {
      get().updateChat(chatId, {
        mutedCharacters: [...chat.mutedCharacters, characterId],
      });
    }
  },

  unmuteCharacter: (chatId: string, characterId: string) => {
    const chat = get().chats[chatId];
    if (chat) {
      get().updateChat(chatId, {
        mutedCharacters: chat.mutedCharacters.filter((id) => id !== characterId),
      });
    }
  },

  hydrate: async () => {
    const [chats, messages] = await Promise.all([
      loadData<Record<string, Chat>>(KEYS.CHATS),
      loadData<Record<string, Message[]>>(KEYS.MESSAGES),
    ]);
    const pinned = await loadData<string[]>('adda:pinned');
    if (chats) set({ chats });
    if (messages) set({ messages });
    if (pinned) set({ pinnedChatIds: pinned });
  },

  persist: () => {
    const { chats, messages, pinnedChatIds } = get();
    saveData(KEYS.CHATS, chats);
    saveData(KEYS.MESSAGES, messages);
    saveData('adda:pinned' as any, pinnedChatIds);
  },

  getSortedChats: () => {
    const { pinnedChatIds } = get();
    const all = Object.values(get().chats).sort(
      (a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
    );
    const pinned = all.filter((c) => pinnedChatIds.includes(c.id));
    const rest   = all.filter((c) => !pinnedChatIds.includes(c.id));
    return [...pinned, ...rest];
  },
}));

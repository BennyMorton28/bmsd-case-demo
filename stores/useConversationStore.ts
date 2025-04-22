import { create } from "zustand";
import { Item } from "@/lib/assistant";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { CHARACTERS } from "@/config/constants";
import { persist, createJSONStorage } from "zustand/middleware";

// Generate a new ID for each app load/build
const BUILD_ID = Date.now().toString();

interface CharacterState {
  chatMessages: Item[];
  conversationItems: any[];
  lastResponseId?: string;
  threadId?: string;
}

interface ConversationState {
  buildId: string;
  selectedCharacter: string;
  characters: Record<string, CharacterState>;
  setSelectedCharacter: (character: string) => void;
  setChatMessages: (items: Item[]) => void;
  setConversationItems: (messages: any[]) => void;
  addChatMessage: (item: Item) => void;
  addConversationItem: (message: ChatCompletionMessageParam) => void;
  setLastResponseId: (responseId: string) => void;
  setThreadId: (threadId: string) => void;
  clearConversation: () => void;
  clearAllConversations: () => void;
  rawSet: (state: any) => void;
}

const initialCharacterState = (characterId: string) => ({
  chatMessages: [],
  conversationItems: [],
  lastResponseId: undefined,
  threadId: undefined,
});

// Initialize state for each character
const initialCharacters: Record<string, CharacterState> = Object.keys(CHARACTERS).reduce(
  (acc, characterId) => ({
    ...acc,
    [characterId]: initialCharacterState(characterId),
  }),
  {}
);

// Initial state creator
const createInitialState = () => ({
  buildId: BUILD_ID,
  selectedCharacter: "emily_carter",
  characters: initialCharacters,
});

// Clear any existing storage on initial load
if (typeof window !== 'undefined') {
  localStorage.removeItem('conversation-storage');
}

const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      
      setSelectedCharacter: (character) => set({ selectedCharacter: character }),
      
      setChatMessages: (items) =>
        set((state) => ({
          characters: {
            ...state.characters,
            [state.selectedCharacter]: {
              ...state.characters[state.selectedCharacter],
              chatMessages: items,
            },
          },
        })),
        
      setConversationItems: (messages) =>
        set((state) => ({
          characters: {
            ...state.characters,
            [state.selectedCharacter]: {
              ...state.characters[state.selectedCharacter],
              conversationItems: messages,
            },
          },
        })),
        
      addChatMessage: (item) =>
        set((state) => ({
          characters: {
            ...state.characters,
            [state.selectedCharacter]: {
              ...state.characters[state.selectedCharacter],
              chatMessages: [...state.characters[state.selectedCharacter].chatMessages, item],
            },
          },
        })),
        
      addConversationItem: (message) =>
        set((state) => ({
          characters: {
            ...state.characters,
            [state.selectedCharacter]: {
              ...state.characters[state.selectedCharacter],
              conversationItems: [...state.characters[state.selectedCharacter].conversationItems, message],
            },
          },
        })),

      setLastResponseId: (responseId) =>
        set((state) => ({
          characters: {
            ...state.characters,
            [state.selectedCharacter]: {
              ...state.characters[state.selectedCharacter],
              lastResponseId: responseId,
            },
          },
        })),

      setThreadId: (threadId) =>
        set((state) => ({
          characters: {
            ...state.characters,
            [state.selectedCharacter]: {
              ...state.characters[state.selectedCharacter],
              threadId: threadId,
            },
          },
        })),

      clearConversation: () =>
        set((state) => ({
          characters: {
            ...state.characters,
            [state.selectedCharacter]: { ...initialCharacterState(state.selectedCharacter) },
          },
        })),

      clearAllConversations: () => set(createInitialState()),

      rawSet: set,
    }),
    {
      name: 'conversation-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        buildId: state.buildId,
        selectedCharacter: state.selectedCharacter,
        characters: state.characters,
      }),
    }
  )
);

export default useConversationStore;

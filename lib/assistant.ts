import { CHARACTERS } from "@/config/constants";
import { parse } from "partial-json";
import { handleTool } from "@/lib/tools/tools-handling";
import useConversationStore from "@/stores/useConversationStore";
import { getTools } from "./tools/tools";
import { Annotation } from "@/components/annotations";
import { functionsMap } from "@/config/functions";

export interface ContentItem {
  type: "input_text" | "output_text" | "refusal" | "output_audio";
  annotations?: Annotation[];
  text?: string;
}

// Message items for storing conversation history matching API shape
export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system" | "developer";
  id?: string;
  content: ContentItem[];
}

// Custom items to display in chat
export interface ToolCallItem {
  type: "tool_call";
  tool_type: "file_search_call" | "web_search_call" | "function_call";
  status: "in_progress" | "completed" | "failed" | "searching";
  id: string;
  name?: string | null;
  call_id?: string;
  arguments?: string;
  parsedArguments?: any;
  output?: string | null;
}

export type Item = MessageItem | ToolCallItem;

export const handleTurn = async (
  messages: any[],
  tools: any[],
  onMessage: (data: any) => void
) => {
  const { selectedCharacter, characters, setLastResponseId } = useConversationStore.getState();
  const currentCharacter = characters[selectedCharacter];
  // Only use previousResponseId if it starts with 'resp_'
  const previousResponseId = currentCharacter.lastResponseId?.startsWith('resp_') 
    ? currentCharacter.lastResponseId 
    : undefined;

  try {
    const response = await fetch("/api/turn_response", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({
        messages: messages,
        tools: tools,
        previousResponseId: previousResponseId,
      }),
    });

    if (!response.ok) {
      console.error(`Error: ${response.status} - ${response.statusText}`);
      return;
    }

    console.log("Starting to read stream...");
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";
    let currentResponseId: string | null = null;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      
      if (value) {
        const chunkValue = decoder.decode(value, { stream: true });
        buffer += chunkValue;

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") {
              done = true;
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              
              // Track the response ID from the response.created event
              if (data.event === "response.created" && data.data?.id?.startsWith('resp_')) {
                currentResponseId = data.data.id;
                if (currentResponseId) {
                  setLastResponseId(currentResponseId);
                }
              }
              
              await Promise.resolve().then(() => onMessage(data));
            } catch (e) {
              console.error("Error parsing data:", e);
            }
          }
        }
      }
    }

    if (buffer && buffer.startsWith("data: ")) {
      const dataStr = buffer.slice(6);
      if (dataStr !== "[DONE]") {
        try {
          const data = JSON.parse(dataStr);
          if (data.event === "response.created" && data.data?.id?.startsWith('resp_')) {
            currentResponseId = data.data.id;
            if (currentResponseId) {
              setLastResponseId(currentResponseId);
            }
          }
          await Promise.resolve().then(() => onMessage(data));
        } catch (e) {
          console.error("Error parsing remaining data:", e);
        }
      }
    }
  } catch (error) {
    console.error("Error handling turn:", error);
  }
};

export const processMessages = async () => {
  const {
    selectedCharacter,
    characters,
    setChatMessages,
    setConversationItems,
    setLastResponseId,
  } = useConversationStore.getState();

  const currentCharacter = characters[selectedCharacter];
  const tools = getTools();

  // Get the character's prompt
  const characterPrompt = CHARACTERS[selectedCharacter].prompt;

  const allConversationItems = [
    // Add the character's prompt as the developer prompt
    {
      role: "developer",
      content: characterPrompt,
    },
    ...currentCharacter.conversationItems,
  ];

  // Track message content by ID
  const messageContents = new Map<string, string>();

  await handleTurn(allConversationItems, tools, async (eventData) => {
    const { event, data } = eventData;
    console.log("Processing event:", event, data);

    switch (event) {
      case "response.output_text.delta": {
        const { delta, item_id } = data;
        
        // Initialize or update the content for this message
        const currentContent = messageContents.get(item_id) || "";
        const newContent = currentContent + (delta || "");
        messageContents.set(item_id, newContent);

        // Store the response ID for threading
        if (!currentCharacter.lastResponseId) {
          setLastResponseId(item_id);
        }

        // Find or create message
        const messageIndex = currentCharacter.chatMessages.findIndex(
          (m) => m.type === "message" && m.id === item_id
        );

        if (messageIndex === -1) {
          // Create new message
          currentCharacter.chatMessages.push({
            type: "message",
            role: "assistant",
            id: item_id,
            content: [
              {
                type: "output_text",
                text: newContent,
              },
            ],
          } as MessageItem);
          
          // Update immediately to start showing the message
          setChatMessages([...currentCharacter.chatMessages]);
        } else {
          // Update existing message
          const message = currentCharacter.chatMessages[messageIndex];
          if (message.type === "message") {
            // Create a new content object to ensure React detects the change
            message.content = [
              {
                ...message.content[0],
                type: "output_text",
                text: newContent,
              },
            ];
            
            // Use a shallow copy of the array to trigger React updates
            const updatedMessages = [...currentCharacter.chatMessages];
            setChatMessages(updatedMessages);
          }
        }
        
        break;
      }

      case "response.output_text.annotation.added": {
        const { item_id, annotation } = data;
        const message = currentCharacter.chatMessages.find(
          (m) => m.type === "message" && m.id === item_id
        );
        if (message && message.type === "message") {
          const contentItem = message.content[0];
          if (contentItem && contentItem.type === "output_text") {
            contentItem.annotations = [
              ...(contentItem.annotations ?? []),
              annotation,
            ];
          }
          setChatMessages([...currentCharacter.chatMessages]);
        }
        break;
      }

      case "response.output_item.added": {
        const { item } = data;
        if (!item || !item.type) {
          break;
        }
        switch (item.type) {
          case "message": {
            const text = item.content?.[0]?.text || "";
            currentCharacter.chatMessages.push({
              type: "message",
              role: "assistant",
              id: item.id,
              content: [
                {
                  type: "output_text",
                  text,
                },
              ],
            });
            currentCharacter.conversationItems.push({
              role: "assistant",
              content: text,
            });
            setChatMessages([...currentCharacter.chatMessages]);
            setConversationItems([...currentCharacter.conversationItems]);
            break;
          }
          case "function_call": {
            currentCharacter.chatMessages.push({
              type: "tool_call",
              tool_type: "function_call",
              status: "in_progress",
              id: item.id,
              name: item.name,
              arguments: "",
              parsedArguments: {},
              output: null,
            });
            setChatMessages([...currentCharacter.chatMessages]);
            break;
          }
          case "web_search_call": {
            currentCharacter.chatMessages.push({
              type: "tool_call",
              tool_type: "web_search_call",
              status: item.status || "in_progress",
              id: item.id,
            });
            setChatMessages([...currentCharacter.chatMessages]);
            break;
          }
          case "file_search_call": {
            currentCharacter.chatMessages.push({
              type: "tool_call",
              tool_type: "file_search_call",
              status: item.status || "in_progress",
              id: item.id,
            });
            setChatMessages([...currentCharacter.chatMessages]);
            break;
          }
        }
        break;
      }

      case "response.completed": {
        // Add the final message to conversation items
        const lastMessage = currentCharacter.chatMessages[currentCharacter.chatMessages.length - 1];
        if (lastMessage && lastMessage.type === "message") {
          currentCharacter.conversationItems.push({
            role: "assistant",
            content: lastMessage.content[0].text || "",
          });
          setConversationItems([...currentCharacter.conversationItems]);
        }
        break;
      }

      case "response.output_text.done": {
        const { item_id, text } = data;
        // Set the final text
        messageContents.set(item_id, text);
        
        const message = currentCharacter.chatMessages.find(
          (m) => m.type === "message" && m.id === item_id
        );
        if (message && message.type === "message") {
          message.content = [
            {
              type: "output_text",
              text: text,
            },
          ];
          setChatMessages([...currentCharacter.chatMessages]);
        }
        break;
      }

      case "response.function_call_arguments.delta": {
        const { item_id, delta } = data;
        // Initialize or update function arguments for this call
        const currentArgs = messageContents.get(item_id) || "";
        const newArgs = currentArgs + (delta || "");
        messageContents.set(item_id, newArgs);
        
        let parsedArgs = {};
        try {
          if (newArgs.length > 0) {
            parsedArgs = parse(newArgs);
          }
        } catch {
          // partial JSON can fail parse; ignore
        }

        const toolCallMessage = currentCharacter.chatMessages.find((m) => m.id === item_id);
        if (toolCallMessage && toolCallMessage.type === "tool_call") {
          toolCallMessage.arguments = newArgs;
          toolCallMessage.parsedArguments = parsedArgs;
          setChatMessages([...currentCharacter.chatMessages]);
        }
        break;
      }

      case "response.function_call_arguments.done": {
        // This has the full final arguments string
        const { item_id, arguments: finalArgs } = data;

        // Mark the tool_call as "completed" and parse the final JSON
        const toolCallMessage = currentCharacter.chatMessages.find((m) => m.id === item_id);
        if (toolCallMessage && toolCallMessage.type === "tool_call") {
          toolCallMessage.arguments = finalArgs;
          toolCallMessage.parsedArguments = parse(finalArgs);
          toolCallMessage.status = "completed";
          setChatMessages([...currentCharacter.chatMessages]);

          // Handle tool call (execute function)
          const toolResult = await handleTool(
            toolCallMessage.name as keyof typeof functionsMap,
            toolCallMessage.parsedArguments
          );

          // Record tool output
          toolCallMessage.output = JSON.stringify(toolResult);
          setChatMessages([...currentCharacter.chatMessages]);
          currentCharacter.conversationItems.push({
            type: "function_call_output",
            call_id: toolCallMessage.call_id,
            status: "completed",
            output: JSON.stringify(toolResult),
          });
          setConversationItems([...currentCharacter.conversationItems]);

          // Create another turn after tool output has been added
          await processMessages();
        }
        break;
      }

      case "response.web_search_call.completed": {
        const { item_id, output } = data;
        const toolCallMessage = currentCharacter.chatMessages.find((m) => m.id === item_id);
        if (toolCallMessage && toolCallMessage.type === "tool_call") {
          toolCallMessage.output = output;
          toolCallMessage.status = "completed";
          setChatMessages([...currentCharacter.chatMessages]);
        }
        break;
      }

      case "response.file_search_call.completed": {
        const { item_id, output } = data;
        const toolCallMessage = currentCharacter.chatMessages.find((m) => m.id === item_id);
        if (toolCallMessage && toolCallMessage.type === "tool_call") {
          toolCallMessage.output = output;
          toolCallMessage.status = "completed";
          setChatMessages([...currentCharacter.chatMessages]);
        }
        break;
      }
    }
  });
};

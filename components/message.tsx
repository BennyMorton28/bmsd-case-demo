import { MessageItem } from "@/lib/assistant";
import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface MessageProps {
  message: MessageItem;
}

const tailwindConfig = {
  theme: {
    extend: {
      animation: {
        pulse: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
};

const Message: React.FC<MessageProps> = ({ message }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const cursorIntervalRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);
  const cursorPositionRef = useRef<HTMLSpanElement>(null);
  
  // Generate a unique ID for the message based on its content
  const getMessageId = () => {
    const text = getMessageText();
    return `message-${message.role}-${text.slice(0, 50)}`; // Use first 50 chars as identifier
  };

  // Check if message has been displayed before
  const hasBeenDisplayedBefore = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(getMessageId()) === 'true';
  };

  // Mark message as displayed
  const markAsDisplayed = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getMessageId(), 'true');
  };

  const getMessageText = () => {
    if (!message.content || !Array.isArray(message.content) || message.content.length === 0) {
      return "";
    }

    const content = message.content[0] as string | { text?: string; type?: string };
    
    if (typeof content === "string") {
      return content.trim();
    }
    
    if (content && typeof content === "object") {
      if ('text' in content && typeof content.text === "string") {
        return content.text.trim();
      }
      if ('type' in content && content.type === 'output_text' && typeof content.text === "string") {
        return content.text.trim();
      }
      if ('type' in content && content.type === 'output_text') {
        return String(content.text || "").trim();
      }
    }

    return "";
  };

  const messageText = getMessageText();

  useEffect(() => {
    if (!messageText) {
      setDisplayedText("");
      return;
    }

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // For user messages or previously displayed messages, show immediately
    if (message.role === "user" || hasBeenDisplayedBefore()) {
      setDisplayedText(messageText);
      setIsThinking(false);
      if (message.role !== "user") {
        markAsDisplayed();
      }
      return;
    }
    
    // Reset state for new message
    setDisplayedText("");
    setIsReady(true);
    setIsThinking(true);
    isTypingRef.current = true;

    // Start typing animation after a brief delay
    const startTyping = () => {
      setIsThinking(false);
      let visibleIndex = 0;
      
      const animateText = () => {
        if (visibleIndex < messageText.length) {
          setDisplayedText(messageText.slice(0, visibleIndex + 1));
          visibleIndex++;
          timeoutRef.current = setTimeout(animateText, 0);
        } else {
          isTypingRef.current = false;
          markAsDisplayed();
        }
      };

      // Start the animation immediately
      animateText();
    };

    // Brief initial delay
    timeoutRef.current = setTimeout(startTyping, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isTypingRef.current = false;
      setIsThinking(false);
    };
  }, [messageText, message.role]);

  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      return !inline ? (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="rounded-md"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-100 rounded px-1 py-0.5" {...props}>
          {children}
        </code>
      );
    },
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full divide-y divide-gray-200">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return <thead className="bg-gray-50">{children}</thead>;
    },
    th({ children }: any) {
      return (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{children}</td>;
    },
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-gray-200 pl-4 my-4">
          {children}
        </blockquote>
      );
    },
    em({ children }: any) {
      // Render emphasized text (italics) as normal text
      return <span>{children}</span>;
    },
    a({ children, href }: any) {
      return (
        <a href={href} className="text-blue-500 hover:text-blue-700 underline">
          {children}
        </a>
      );
    }
  };

  if (message.role === "user") {
    return (
      <div className="text-base">
        <div className="flex justify-end">
          <div>
            <div className="ml-4 rounded-[16px] px-4 py-2 md:ml-24 bg-[#ededed] text-stone-900 font-normal font-sans text-lg">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MarkdownComponents}
              >
                {messageText}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-base">
      <div className="flex">
        <div className="mr-4 rounded-[16px] px-4 py-2 md:mr-24 text-black bg-white font-normal font-sans text-lg">
          <div className="whitespace-pre-wrap break-words">
            {isReady && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MarkdownComponents}
              >
                {displayedText}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;

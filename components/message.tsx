import { MessageItem } from "@/lib/assistant";
import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { TypewriterEffectWithMarkdown } from './ui/typewriter-effect-with-markdown';

interface MessageProps {
  message: MessageItem;
  setIsGenerating?: React.Dispatch<React.SetStateAction<boolean>>;
}

const Message: React.FC<MessageProps> = ({ message, setIsGenerating }) => {
  const [isTypewriting, setIsTypewriting] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const displayedRef = useRef(new Set<string>());

  const getMessageText = () => {
    if (message.type !== 'message' || !message.content || message.content.length === 0) {
      return '';
    }
    return message.content[0].text || '';
  };

  const hasBeenDisplayedBefore = () => {
    const messageId = message.id || message.content[0]?.text || '';
    return displayedRef.current.has(messageId);
  };

  const markAsDisplayed = () => {
    const messageId = message.id || message.content[0]?.text || '';
    displayedRef.current.add(messageId);
    setIsTypewriting(false);
  };

  const messageText = getMessageText();

  useEffect(() => {
    if (!messageText) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (hasBeenDisplayedBefore()) {
      markAsDisplayed();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [messageText]);

  useEffect(() => {
    if (message.role === 'assistant' && setIsGenerating) {
      setIsGenerating(true);
    }
  }, [message.role, setIsGenerating]);

  const onTypewriterComplete = () => {
    if (setIsGenerating) {
      setIsGenerating(false);
    }
    setIsTypewriting(false);
  };

  // Type-safe role check
  const isUserMessage = message.role === 'user' as const;
  const isAssistantMessage = message.role === 'assistant' as const;

  // Minimal markdown components configuration
  const MarkdownComponents = {
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      return !inline ? (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="rounded-md my-4"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-100 rounded px-1 py-0.5 text-red-500" {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <div className={`flex gap-3 ${isUserMessage ? 'bg-gray-50' : 'bg-white'} py-4`}>
      <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-md border shadow overflow-hidden">
        {isAssistantMessage ? (
          <img src="/BMSDIcon.jpeg" alt="BMSD Assistant" className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-sm bg-black">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="flex-1 px-4 space-y-2 overflow-hidden">
        {isAssistantMessage && !hasBeenDisplayedBefore() ? (
          <div className="prose prose-stone prose-headings:font-bold prose-strong:font-bold prose-pre:p-0">
            <TypewriterEffectWithMarkdown 
              text={messageText} 
              onComplete={onTypewriterComplete}
              markdownComponents={MarkdownComponents}
              delay={2}
            />
            {messageText.length > 100 && isTypewriting && (
              <button 
                onClick={markAsDisplayed}
                className="text-xs text-gray-500 hover:text-gray-700 underline mt-1"
              >
                Display immediately
              </button>
            )}
          </div>
        ) : (
          <div className="prose prose-stone prose-headings:font-bold prose-strong:font-bold prose-pre:p-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {messageText}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
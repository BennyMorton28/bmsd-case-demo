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
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [showCopy, setShowCopy] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isTypewriting, setIsTypewriting] = useState(true);
  
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

  /**
   * Normalize markdown text to fix spacing and formatting issues
   */
  const normalizeMarkdown = (text: string) => {
    if (!text) return '';
    
    // Step 1: Handle dollar signs differently for financial values
    // Don't escape dollar signs that are part of financial values
    let normalized = text;
    
    // First, identify and preserve financial values like $150 million, $1.2 billion, etc.
    // We'll replace them with temporary placeholders to protect them from escaping
    const financialMatches: {placeholder: string, original: string}[] = [];
    let financialMatchCounter = 0;
    
    // Match financial values with pattern $X where X is a number (possibly with commas, periods)
    // potentially followed by "million", "billion", etc.
    const financialRegex = /\$\d+(,\d+)*(\.\d+)?([ ]*(million|billion|thousand|k|m|b|t))?/gi;
    normalized = normalized.replace(financialRegex, (match) => {
      const placeholder = `__FINANCIAL_${financialMatchCounter}__`;
      financialMatches.push({ placeholder, original: match });
      financialMatchCounter++;
      return placeholder;
    });
    
    // Now escape remaining dollar signs (not part of financial values)
    normalized = normalized.replace(/(?<!\\)\$/g, '\\$');
    
    // Restore the financial values from placeholders
    financialMatches.forEach(({ placeholder, original }) => {
      normalized = normalized.replace(placeholder, original);
    });
    
    // Step 2: Fix numbered list items with colon formatting 
    // First pass - replace the colon with a dash after titles
    normalized = normalized.replace(/(\d+\.\s+)([^:\n]+)(\s*):(\s*)/g, '$1$2 - ');
    
    // Step 3: Standardize line breaks around list items
    // Ensures consistent spacing before and after list items
    normalized = normalized.replace(/(\n+)(\d+\.\s+)/g, '\n\n$2');
    
    // Step 4: Remove excessive line breaks between list items
    // This keeps list items close together while preserving spacing between sections
    normalized = normalized.replace(/(\d+\.\s+[^\n]+\n\n)(\d+\.\s+)/g, '$1$2');
    
    // Step 5: Make sure paragraphs have proper separation
    normalized = normalized.replace(/([^\n])(\n)([^\n])/g, '$1\n\n$3');
    
    // Step 6: Handle multi-paragraph list items 
    // Keep correct indentation for multi-line list content
    normalized = normalized.replace(/(\d+\.\s+[^\n]+\n)(\s+)([^\d\s])/g, '$1$2$3');
    
    // Step 7: Normalize multiple consecutive newlines to a maximum of two
    // This prevents excessive whitespace while preserving paragraph breaks
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    
    return normalized;
  };

  const messageText = getMessageText();
  const normalizedText = normalizeMarkdown(messageText);

  useEffect(() => {
    if (!messageText) {
      return;
    }

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // For assistant messages that are streaming in real-time,
    // we just show what's there - no special animation needed
    // The lib/assistant.ts file is already updating the text via OpenAI's streaming
    
    // If the message is already complete (not streaming), mark it as displayed
    if (hasBeenDisplayedBefore()) {
      markAsDisplayed();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [messageText, message.role, normalizedText]);

  useEffect(() => {
    if (message.role === 'assistant' && setIsGenerating) {
      // Start generating if this is the assistant message
      setIsGenerating(true);
    }
  }, [message.role, setIsGenerating]);

  const onTypewriterComplete = () => {
    if (setIsGenerating) {
      setIsGenerating(false);
    }
    setIsTypewriting(false);
  };

  // Custom components with tighter spacing for ReactMarkdown
  const MarkdownComponents = {
    // Root wrapper to control overall spacing
    root({ children }: any) {
      return <div className="markdown-content space-y-2">{children}</div>;
    },
    
    // Code blocks
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      return !inline ? (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="rounded-md my-1"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-100 rounded px-1 py-0.5 text-red-500" {...props}>
          {children}
        </code>
      );
    },
    
    // Paragraphs with minimal spacing
    p({ children }: any) {
      if (!children || (Array.isArray(children) && children.length === 0)) {
        return null;
      }
      return <p className="my-0.5">{children}</p>;
    },
    
    // Headings
    h1({ children }: any) {
      return <h1 className="text-2xl font-bold mt-2 mb-1">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-xl font-bold mt-2 mb-1">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-lg font-bold mt-1 mb-1">{children}</h3>;
    },
    h4({ children }: any) {
      return <h4 className="text-base font-bold mt-1 mb-0.5">{children}</h4>;
    },
    
    // Lists with compact spacing
    ul({ children }: any) {
      if (!children) return null;
      return <ul className="list-disc ml-6 mb-0.5 mt-0.5 space-y-0.5">{children}</ul>;
    },
    ol({ children }: any) {
      if (!children) return null;
      return <ol className="list-decimal ml-6 mb-0.5 mt-0.5 space-y-0.5">{children}</ol>;
    },
    
    // List items with no extra spacing
    li({ children, ...props }: any) {
      // Process any string directly inside a list item to detect Name - Description pattern
      if (Array.isArray(children)) {
        // First check for "Name - Description" pattern that's already processed
        if (children.some(child => 
          typeof child === 'object' && 
          child?.props?.children?.[0]?.props?.className === 'font-bold')) {
          return (
            <li className="my-0" {...props}>
              <div>{children}</div>
            </li>
          );
        }
        
        // Then check for remaining "Name: Description" patterns
        const processedChildren = children.map((child) => {
          if (typeof child === 'string' && child.includes(': ')) {
            const [name, desc] = child.split(': ', 2);
            return (
              <>
                <span className="font-bold">{name}</span> - {desc}
              </>
            );
          }
          return child;
        });

        return (
          <li className="my-0" {...props}>
            {processedChildren}
          </li>
        );
      }
      
      return <li className="my-0" {...props}>{children}</li>;
    },
    
    // Tables
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-1">
          <table className="min-w-full divide-y divide-gray-200 border">
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
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return <td className="px-6 py-4 text-sm text-gray-500 border">{children}</td>;
    },
    tr({ children }: any) {
      return <tr className="even:bg-gray-50">{children}</tr>;
    },
    
    // Blockquotes
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-gray-200 pl-4 py-1 my-1 italic bg-gray-50 rounded-r">
          {children}
        </blockquote>
      );
    },
    
    // Text formatting
    em({ children }: any) {
      return <em className="italic">{children}</em>;
    },
    strong({ children }: any) {
      return <strong className="font-bold">{children}</strong>;
    },
    a({ children, href }: any) {
      return (
        <a href={href} className="text-blue-500 hover:text-blue-700 underline">
          {children}
        </a>
      );
    },
    
    // Horizontal rule
    hr() {
      return <hr className="my-2 border-t border-gray-300" />;
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
                {normalizedText}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative mb-4 flex items-start"
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
    >
      <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-md border shadow overflow-hidden">
        {message.role === 'assistant' ? (
          <img 
            src="/BMSDIcon.jpeg" 
            alt="BMSD Icon" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 px-4 space-y-2 overflow-hidden">
        {message.role === 'assistant' && isTypewriting && !hasBeenDisplayedBefore() ? (
          <div className="prose prose-stone prose-p:leading-relaxed prose-pre:p-0 break-words">
            <TypewriterEffectWithMarkdown 
              text={normalizedText} 
              onComplete={onTypewriterComplete}
              markdownComponents={MarkdownComponents}
            />
            {/* Skip button for immediate display */}
            {normalizedText.length > 100 && (
              <button 
                onClick={() => setIsTypewriting(false)}
                className="text-xs text-gray-500 hover:text-gray-700 underline mt-1"
              >
                Display immediately
              </button>
            )}
          </div>
        ) : (
          <div className="prose prose-stone prose-p:leading-relaxed prose-pre:p-0 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {normalizedText}
            </ReactMarkdown>
          </div>
        )}
        {normalizedText.length > 0 && (
          <button
            className={`absolute right-0 top-0 z-10 size-8 rounded-full bg-white p-0 opacity-0 transition-opacity border ${(showCopy || isCopied) ? 'opacity-100' : ''}`}
            onClick={() => {
              void navigator.clipboard.writeText(normalizedText);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }}
          >
            {isCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
            <span className="sr-only">Copy message</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Message;

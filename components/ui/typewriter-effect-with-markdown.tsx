import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TypewriterEffectWithMarkdownProps {
  text: string;
  delay?: number;
  onComplete?: () => void;
  markdownComponents?: any;
}

export function TypewriterEffectWithMarkdown({ 
  text, 
  delay = 1,
  onComplete,
  markdownComponents
}: TypewriterEffectWithMarkdownProps) {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const previousTextRef = useRef('');
  const isInitialRender = useRef(true);
  const chunkSize = 30;

  useEffect(() => {
    if (isInitialRender.current) {
      setCurrentText('');
      setCurrentIndex(0);
      isInitialRender.current = false;
      previousTextRef.current = text;
      return;
    }
    
    if (text !== previousTextRef.current) {
      previousTextRef.current = text;
      if (currentIndex > text.length) {
        setCurrentIndex(text.length);
      }
    }
  }, [text, currentIndex]);

  useEffect(() => {
    if (!text || currentIndex >= text.length) {
      if (currentIndex >= text.length && onComplete) {
        onComplete();
      }
      return;
    }

    const timer = setTimeout(() => {
      const nextIndex = Math.min(currentIndex + chunkSize, text.length);
      setCurrentText(text.substring(0, nextIndex));
      setCurrentIndex(nextIndex);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, currentIndex, delay, onComplete]);

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {currentText}
      </ReactMarkdown>
    </div>
  );
} 
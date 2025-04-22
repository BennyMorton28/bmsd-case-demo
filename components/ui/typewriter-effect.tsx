import { useEffect, useState, useRef } from 'react';

interface TypewriterEffectProps {
  text: string;
  delay?: number;
  onComplete?: () => void;
  streaming?: boolean;
}

export function TypewriterEffect({ 
  text, 
  delay = 1, // Minimal delay to avoid blocking UI
  onComplete,
  streaming = true
}: TypewriterEffectProps) {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const previousTextRef = useRef('');
  const isInitialRender = useRef(true);
  const chunkSize = 5; // Process multiple characters at once for faster typing

  useEffect(() => {
    // On first render, initialize
    if (isInitialRender.current) {
      setCurrentText('');
      setCurrentIndex(0);
      isInitialRender.current = false;
      previousTextRef.current = text;
      return;
    }
    
    // For streaming content, if text changed, update immediately
    if (streaming && text !== previousTextRef.current) {
      previousTextRef.current = text;
      // Keep current progress in sync with text length
      if (currentIndex > text.length) {
        setCurrentIndex(text.length);
      }
    }
  }, [text, currentIndex, streaming]);

  useEffect(() => {
    if (!text || currentIndex >= text.length) {
      if (currentIndex >= text.length && onComplete) {
        onComplete();
      }
      return;
    }

    // Process characters in chunks for faster typing
    const timer = setTimeout(() => {
      // Calculate how many characters to add
      const charsToAdd = Math.min(chunkSize, text.length - currentIndex);
      const nextIndex = currentIndex + charsToAdd;
      
      // Get next chunk of text
      const nextChunk = text.substring(currentIndex, nextIndex);
      
      // Update text and index
      setCurrentText(prev => prev + nextChunk);
      setCurrentIndex(nextIndex);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, currentIndex, delay, onComplete, chunkSize]);

  return <div className="whitespace-pre-wrap">{currentText}</div>;
} 
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
  const chunkSize = 30; // Increased chunk size for better markdown detection

  // Enhanced helper function to ensure complete markdown
  const ensureCompleteMarkdown = (text: string): string => {
    if (!text) return '';
    
    // Create a copy of the text to work with
    let processedText = text;
    
    // Handle bold markdown - complete pairs of **
    const incompleteRegex = /\*\*([^*]*)$/;
    
    // Check for incomplete bold section at the end
    const incompleteBold = processedText.match(incompleteRegex);
    if (incompleteBold) {
      // Look ahead in the full text to see if there's a closing **
      const fullTextAfterCurrentPos = text.substring(processedText.length);
      const closingStarPos = fullTextAfterCurrentPos.indexOf('**');
      
      if (closingStarPos > -1) {
        // Include the entire bold section
        processedText += fullTextAfterCurrentPos.substring(0, closingStarPos + 2);
      } else {
        // Remove the incomplete **
        processedText = processedText.replace(/\*\*([^*]*)$/, '$1');
      }
    }
    
    // Handle numbered lists - smart detection
    const lines = processedText.split('\n');
    let inList = false;
    
    const processedLines = lines.map((line) => {
      // Check for list item start (e.g., "1. ", "2. ")
      const listItemMatch = line.match(/^(\d+)\.\s+(.*)/);
      
      if (listItemMatch) {
        inList = true;
        const listNumber = parseInt(listItemMatch[1]);
        const listContent = listItemMatch[2];
        
        // Look ahead in the full text for the bold markers if they exist
        if (listContent.includes('**') && 
            (listContent.match(/\*\*/g) || []).length % 2 !== 0) {
          
          // Find the next ** in the full text
          const fullTextAfterCurrentItem = text.substring(
            text.indexOf(line) + line.length
          );
          const closingStarPos = fullTextAfterCurrentItem.indexOf('**');
          
          if (closingStarPos > -1) {
            // Include content up to and including the closing **
            return `${listNumber}. ${listContent}${fullTextAfterCurrentItem.substring(0, closingStarPos + 2)}`;
          }
        }
      } else if (inList && line.trim() === '') {
        inList = false;
      }
      
      return line;
    });
    
    return processedLines.join('\n');
  };

  useEffect(() => {
    // On first render, initialize
    if (isInitialRender.current) {
      setCurrentText('');
      setCurrentIndex(0);
      isInitialRender.current = false;
      previousTextRef.current = text;
      return;
    }
    
    // Handle text changes
    if (text !== previousTextRef.current) {
      previousTextRef.current = text;
      // If current index is beyond text length, reset
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

    // Process text in larger chunks for better markdown context
    const timer = setTimeout(() => {
      // Calculate how many characters to add
      const charsToAdd = Math.min(chunkSize, text.length - currentIndex);
      const nextIndex = currentIndex + charsToAdd;
      
      // Get next chunk of text and intelligently process it
      const rawNextChunk = text.substring(0, nextIndex);
      const processedChunk = ensureCompleteMarkdown(rawNextChunk);
      
      // Update text and index
      setCurrentText(processedChunk);
      setCurrentIndex(nextIndex);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, currentIndex, delay, onComplete]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    >
      {currentText}
    </ReactMarkdown>
  );
} 
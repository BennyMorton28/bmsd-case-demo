// Type declarations for custom UI components

declare module './typewriter-effect' {
  interface TypewriterEffectProps {
    text: string;
    delay?: number;
    onComplete?: () => void;
    streaming?: boolean;
  }
  
  export function TypewriterEffect(props: TypewriterEffectProps): JSX.Element;
}

declare module './typewriter-effect-with-markdown' {
  interface TypewriterEffectWithMarkdownProps {
    text: string;
    delay?: number;
    onComplete?: () => void;
    markdownComponents?: any;
  }
  
  export function TypewriterEffectWithMarkdown(props: TypewriterEffectWithMarkdownProps): JSX.Element;
} 
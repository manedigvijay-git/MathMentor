"use client";

import React from "react";
import { BlockMath, InlineMath } from "react-katex";

interface MathMessageRendererProps {
  content: string;
  className?: string;
}

/**
 * Safe BlockMath wrapper in case KaTeX encounters an invalid mathematical string
 */
function SafeBlockMath({ math }: { math: string }) {
  try {
    return (
      <div className="my-3 overflow-x-auto py-1 text-center font-sans">
        <BlockMath math={math} />
      </div>
    );
  } catch {
    return <pre className="text-xs text-rose-400 bg-rose-950/20 p-2 rounded my-2 font-mono whitespace-pre-wrap">{math}</pre>;
  }
}

/**
 * Safe InlineMath wrapper in case KaTeX encounters an invalid inline string
 */
function SafeInlineMath({ math }: { math: string }) {
  try {
    return <InlineMath math={math} />;
  } catch {
    return <code className="text-xs text-rose-400 font-mono px-1">{math}</code>;
  }
}

/**
 * Parses basic inline Markdown formatting like **bold**, *italic*, and `code`
 */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index} className="italic text-cyan-200">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-[#1E293B] text-cyan-300 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Processes text containing inline math \( ... \) or $ ... $ and inline markdown
 */
function renderMixedText(text: string): React.ReactNode[] {
  const inlineMathRegex = /(\\\([\s\S]*?\\\)|(?:\$[^$\n]+\$))/g;
  const parts = text.split(inlineMathRegex);

  return parts.map((part, idx) => {
    if (part.startsWith("\\(") && part.endsWith("\\)")) {
      const mathContent = part.slice(2, -2).trim();
      return <SafeInlineMath key={`inline-math-${idx}`} math={mathContent} />;
    }
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      const mathContent = part.slice(1, -1).trim();
      return <SafeInlineMath key={`inline-math-dollar-${idx}`} math={mathContent} />;
    }
    return <React.Fragment key={`text-${idx}`}>{parseInlineMarkdown(part)}</React.Fragment>;
  });
}

export function MathMessageRenderer({ content, className = "" }: MathMessageRendererProps) {
  if (!content) return null;

  // Clean up excessive markdown decorative elements (e.g. ### headings, horizontal rules ---)
  const cleanedContent = content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(---|[*]{3,}|_{3,})$/gm, "");

  // Match block math: \[ ... \] or $$ ... $$
  const blockMathRegex = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$)/g;
  const segments = cleanedContent.split(blockMathRegex);

  const elements: React.ReactNode[] = [];

  segments.forEach((segment, segmentIdx) => {
    if (!segment) return;

    if (segment.startsWith("\\[") && segment.endsWith("\\]")) {
      const mathContent = segment.slice(2, -2).trim();
      elements.push(<SafeBlockMath key={`block-${segmentIdx}`} math={mathContent} />);
      return;
    }
    if (segment.startsWith("$$") && segment.endsWith("$$")) {
      const mathContent = segment.slice(2, -2).trim();
      elements.push(<SafeBlockMath key={`block-dollar-${segmentIdx}`} math={mathContent} />);
      return;
    }

    const paragraphs = segment.split(/\n\s*\n/);
    paragraphs.forEach((paragraph, pIdx) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return;

      elements.push(
        <p key={`p-${segmentIdx}-${pIdx}`} className="my-2 leading-relaxed text-[#E2E8F0]">
          {renderMixedText(trimmed)}
        </p>
      );
    });
  });

  return <div className={`math-message-renderer text-sm leading-relaxed ${className}`}>{elements}</div>;
}

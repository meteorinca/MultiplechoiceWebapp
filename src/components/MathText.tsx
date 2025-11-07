import type { FC, ReactNode } from 'react';
import { Fragment, useMemo } from 'react';
import { BlockMath, InlineMath } from 'react-katex';

type DisplayMode = 'block' | 'inline';

type Segment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; mode: DisplayMode };

interface MathTextProps {
  text: string;
  className?: string;
  displayMode?: DisplayMode;
}

const mathIndicatorPatterns = [
  /\$\$[\s\S]+?\$\$/,
  /\\\([^)]+\\\)/,
  /\\\[[^\]]+\\\]/,
  /\\(?:frac|sum|int|lim|sqrt|theta|alpha|beta|gamma|pi|times|cdot|pm|Sigma|Delta|nabla)\b/,
  /(?:^|\s)(?:[0-9A-Za-z]+)\s*(?:\^|_)\s*(?:[0-9A-Za-z]+)/,
];

const hasMathTokens = (text: string): boolean => {
  if (!text) {
    return false;
  }
  return mathIndicatorPatterns.some((pattern) => pattern.test(text));
};

const splitSegments = (text: string): Segment[] => {
  if (!text) {
    return [];
  }

  const segments: Segment[] = [];
  const regex = /\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
      });
    }
    const [, blockMatch, inlineMatch, displayMatch] = match;
    if (blockMatch) {
      segments.push({
        type: 'math',
        value: blockMatch.trim(),
        mode: 'block',
      });
    } else if (inlineMatch) {
      segments.push({
        type: 'math',
        value: inlineMatch.trim(),
        mode: 'inline',
      });
    } else if (displayMatch) {
      segments.push({
        type: 'math',
        value: displayMatch.trim(),
        mode: 'block',
      });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return segments;
};

const renderTextContent = (value: string): ReactNode => {
  const lines = value.split('\n');
  return lines.map((line, lineIndex) => (
    <Fragment key={`line-${lineIndex}`}>
      {line}
      {lineIndex < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
};

const MathText: FC<MathTextProps> = ({
  text,
  className,
  displayMode = 'block',
}) => {
  const segments = useMemo(() => splitSegments(text), [text]);
  const containsExplicitMath = segments.some((segment) => segment.type === 'math');
  const shouldRenderMath = containsExplicitMath || hasMathTokens(text);
  const Wrapper = displayMode === 'inline' ? 'span' : 'div';

  if (!shouldRenderMath) {
    return <Wrapper className={className}>{renderTextContent(text)}</Wrapper>;
  }

  const segmentsToRender: Segment[] = containsExplicitMath
    ? segments
    : [
        {
          type: 'math',
          value: text.trim(),
          mode: displayMode,
        },
      ];

  return (
    <Wrapper className={className}>
      {segmentsToRender.map((segment, index) => {
        if (segment.type === 'math') {
          const mode = segment.mode ?? displayMode;
          return mode === 'inline' ? (
            <InlineMath key={`math-${index}`}>{segment.value}</InlineMath>
          ) : (
            <BlockMath key={`math-${index}`}>{segment.value}</BlockMath>
          );
        }
        return (
          <Fragment key={`text-${index}`}>
            {renderTextContent(segment.value)}
          </Fragment>
        );
      })}
    </Wrapper>
  );
};

export default MathText;

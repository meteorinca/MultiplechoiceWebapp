import type { FC, ReactNode } from 'react';
import { Fragment, useMemo } from 'react';
import { BlockMath, InlineMath } from 'react-katex';

type DisplayMode = 'block' | 'inline';

type Segment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string };

interface MathTextProps {
  text: string;
  className?: string;
  displayMode?: DisplayMode;
}

const splitSegments = (text: string): Segment[] => {
  if (!text) {
    return [];
  }

  const segments: Segment[] = [];
  const regex = /\$\$([\s\S]+?)\$\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
      });
    }
    segments.push({ type: 'math', value: match[1].trim() });
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
  const Wrapper = displayMode === 'inline' ? 'span' : 'div';

  if (!segments.length) {
    return <Wrapper className={className}>{text}</Wrapper>;
  }

  return (
    <Wrapper className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'math') {
          return displayMode === 'inline' ? (
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

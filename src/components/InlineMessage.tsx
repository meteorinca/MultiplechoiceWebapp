import type { FC, ReactNode } from 'react';

type MessageType = 'success' | 'error' | 'info';

interface InlineMessageProps {
  text: string;
  type?: MessageType;
  icon?: ReactNode;
  onDismiss?: () => void;
}

const stylesByType: Record<MessageType, string> = {
  success: 'bg-mint-50 text-mint-600',
  error: 'bg-blush-200 text-rose-500',
  info: 'bg-cream-100 text-cocoa-500',
};

const defaultIcons: Record<MessageType, string> = {
  success: '\u2605',
  error: '!',
  info: 'i',
};

const InlineMessage: FC<InlineMessageProps> = ({
  text,
  type = 'info',
  icon,
  onDismiss,
}) => {
  return (
    <div
      className={`mt-6 flex items-center justify-between gap-4 rounded-2xl px-4 py-3 text-sm font-semibold ${stylesByType[type]}`}
    >
      <span className="flex items-center gap-3">
        <span aria-hidden>{icon ?? defaultIcons[type]}</span>
        <span>{text}</span>
      </span>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss message"
          className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-cocoa-500 transition hover:border-cocoa-200"
          onClick={onDismiss}
        >
          Close
        </button>
      )}
    </div>
  );
};

export default InlineMessage;

import { motion, AnimatePresence } from 'framer-motion';

interface TypingUser {
  user_id: string;
  display_name: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  let text: string;
  if (typingUsers.length === 1) {
    text = `${typingUsers[0].display_name} is typing`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0].display_name} and ${typingUsers[1].display_name} are typing`;
  } else {
    text = `${typingUsers.length} people are typing`;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="typing"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        style={{
          padding: '2px 16px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 24,
        }}
      >
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              style={{
                display: 'block',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--text-muted)',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {text}...
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

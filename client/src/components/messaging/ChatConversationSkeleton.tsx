import styles from './ChatConversationSkeleton.module.css';

const PLACEHOLDERS = [
  { side: 'theirs' as const, width: '68%' },
  { side: 'mine' as const, width: '52%' },
  { side: 'theirs' as const, width: '74%' },
  { side: 'mine' as const, width: '44%' },
];

export function ChatConversationSkeleton() {
  return (
    <div className={styles.shell} aria-busy="true" aria-label="Loading conversation">
      <header className={styles.header}>
        <span className={styles.back} />
        <span className={styles.avatar} />
        <span className={styles.titleBlock}>
          <span className={styles.titleLine} />
          <span className={styles.subtitleLine} />
        </span>
      </header>

      <div className={styles.loaderWrap}>
        <span className={styles.loader} aria-hidden />
      </div>

      <div className={styles.messages}>
        {PLACEHOLDERS.map((item, index) => (
          <div
            key={index}
            className={[styles.bubble, item.side === 'mine' ? styles.mine : styles.theirs].join(' ')}
            style={{ width: item.width }}
          />
        ))}
      </div>

      <footer className={styles.composer}>
        <span className={styles.attach} />
        <span className={styles.input} />
        <span className={styles.send} />
      </footer>
    </div>
  );
}

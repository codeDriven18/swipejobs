import styles from './PortalSkeleton.module.css';

function S({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`${styles.shimmer} ${className}`} style={style} aria-hidden />;
}

export function TodayPageSkeleton() {
  return (
    <div className={styles.todaySkeleton} aria-busy="true" aria-label="Loading workspace">
      <div className={styles.todayMain}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.todayCard}>
            <div className={styles.todayCardHead}>
              <S className={styles.line} style={{ width: '7rem' }} />
            </div>
            <div className={styles.todayCardBody}>
              {[0, 1, 2].map((j) => (
                <div key={j} className={styles.todayRow}>
                  <S className={styles.avatar} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <S className={styles.line} style={{ width: `${60 + j * 10}%` }} />
                    <S className={styles.lineShort} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.todayRail}>
        {[0, 1].map((i) => (
          <div key={i} className={styles.todayCard}>
            <div className={styles.todayCardHead}>
              <S className={styles.line} style={{ width: '8rem' }} />
            </div>
            <div className={styles.todayCardBody}>
              {[0, 1, 2, 3].map((j) => (
                <S key={j} className={styles.line} style={{ width: `${55 + j * 8}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineListSkeleton() {
  return (
    <div className={styles.pipelineListSkeleton} aria-busy="true" aria-label="Loading candidates">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={styles.pipelineRow}>
          <S className={styles.avatar} />
          <div className={styles.pipelineRowCells}>
            <S className={styles.line} style={{ width: `${50 + (i % 3) * 15}%` }} />
            <S className={styles.lineShort} />
            <S className={styles.lineShort} style={{ width: '60%' }} />
            <S className={styles.line} style={{ width: '5rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CampaignsSkeleton() {
  return (
    <div className={styles.campaignsGrid} aria-busy="true" aria-label="Loading campaigns">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={styles.campaignCard}>
          <S className={`${styles.shimmer} ${styles.campaignCardImg}`} />
          <div className={styles.campaignCardBody}>
            <S className={styles.lineTitle} />
            <S className={styles.lineShort} />
            <S className={styles.line} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <S className={styles.line} style={{ width: '4rem', height: '1.5rem', borderRadius: '999px' }} />
              <S className={styles.line} style={{ width: '4rem', height: '1.5rem', borderRadius: '999px' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CandidateProfileSkeleton() {
  return (
    <div className={styles.profileSkeleton} aria-busy="true" aria-label="Loading candidate">
      <div>
        <S className={`${styles.shimmer} ${styles.heroCover}`} />
        <div className={styles.heroBody}>
          <S className={`${styles.shimmer} ${styles.heroAvatar}`} />
          <div className={styles.heroInfo}>
            <S className={styles.lineTitle} style={{ width: '55%' }} />
            <S className={styles.line} style={{ width: '40%' }} />
            <S className={styles.lineShort} style={{ width: '30%' }} />
          </div>
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.sectionCard}>
          <S className={styles.lineTitle} style={{ width: '8rem' }} />
          <S className={styles.line} />
          <S className={styles.line} style={{ width: '80%' }} />
          {i === 0 && <S className={styles.lineShort} />}
        </div>
      ))}
    </div>
  );
}

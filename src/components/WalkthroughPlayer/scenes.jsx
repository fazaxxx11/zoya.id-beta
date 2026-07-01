// 5 scene walkthrough end-to-end: upload → pilih uji → hasil → interpretasi AI → export.
// Tiap mockup adalah inline React element (bukan screenshot).
// Cursor target: persentase koordinat di player area (0-100).

import { FileUp, Check, Download, FileText } from 'lucide-react';
import styles from './WalkthroughPlayer.module.css';

export const SCENES = [
  {
    id: 'upload',
    durationMs: 15000,
    caption: 'Mulai dengan mengupload file CSV atau Excel Anda.',
    cursor: { x: 50, y: 55, clickAt: 3000 },
    mockup: ({ progress }) => (
      <div className={styles.mockup}>
        <div className={`${styles.mockupCard} ${styles.uploadZone} ${progress > 0.2 ? styles.uploadZoneActive : ''}`}>
          <FileUp style={{ width: 28, height: 28, margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
          <div>Drag file atau klik untuk pilih</div>
          {progress > 0.25 && (
            <div className={styles.fileName}>
              <Check style={{ width: 12, height: 12, color: 'rgb(var(--accent))' }} />
              data_prepost.csv
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    id: 'pilih-analisis',
    durationMs: 10000,
    caption: 'Pilih jenis analisis yang sesuai pertanyaan penelitian Anda.',
    cursor: { x: 40, y: 62, clickAt: 4000 },
    mockup: ({ progress }) => (
      <div className={styles.mockup}>
        <div className={styles.mockupCard}>
          <div className={styles.optionList}>
            {['Statistik Deskriptif', 'T-Test Independent', 'ANOVA', 'Regresi Linier'].map((opt, i) => {
              const selected = progress > 0.35 && i === 1;
              return (
                <div key={opt} className={`${styles.option} ${selected ? styles.optionSelected : ''}`}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid rgb(var(--border))', display: 'inline-block' }} />
                  {opt}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'hasil-uji',
    durationMs: 15000,
    caption: 'Hasil uji muncul otomatis: statistik, p-value, dan effect size.',
    cursor: { x: 50, y: 50, clickAt: -1 },
    mockup: ({ progress }) => {
      const rows = [
        ['Mean (kelompok 1)', '78.4'],
        ['Mean (kelompok 2)', '72.1'],
        ['t-statistic', '2.87'],
        ['p-value', '0.006'],
        ["Cohen's d", '0.62'],
      ];
      const visibleCount = Math.floor(progress * rows.length * 1.5);
      return (
        <div className={styles.mockup}>
          <div className={styles.mockupCard}>
            <table className={styles.resultTable}>
              <thead>
                <tr><th>Statistik</th><th>Nilai</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, Math.min(visibleCount, rows.length)).map(([k, v]) => (
                  <tr key={k} className={styles.resultRow}>
                    <td>{k}</td><td><strong>{v}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    },
  },
  {
    id: 'interpretasi-ai',
    durationMs: 15000,
    caption: 'Klik Generate untuk interpretasi siap-paste berbahasa akademik.',
    cursor: { x: 75, y: 30, clickAt: 3000 },
    mockup: ({ progress }) => {
      const sampleText = "Berdasarkan uji t independen pada data pre dan post, ditemukan perbedaan signifikan antara kedua kelompok (t=2.87, p=0.006). Ukuran efek Cohen's d sebesar 0.62 menunjukkan magnitude perbedaan yang moderate.";
      const words = sampleText.split(/\s+/);
      const wordCount = progress > 0.25 ? Math.floor((progress - 0.25) * words.length * 1.4) : 0;
      const visible = words.slice(0, Math.min(wordCount, words.length)).join(' ');
      const typing = wordCount > 0 && wordCount < words.length;
      return (
        <div className={styles.mockup}>
          <div className={`${styles.mockupCard} ${styles.aiPanel}`}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Interpretasi AI
            </div>
            {progress <= 0.25 ? (
              <div style={{ fontSize: '0.6875rem', color: 'rgb(var(--accent))', fontWeight: 500, padding: '4px 10px', border: '1px solid rgb(var(--accent))', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>
                Generate
              </div>
            ) : progress <= 0.35 ? (
              <div style={{ fontSize: '0.6875rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgb(var(--accent))', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Menyusun interpretasi...
              </div>
            ) : (
              <div className={styles.aiText}>
                {visible}
                {typing && <span className={styles.typingCursor} />}
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: 'export',
    durationMs: 15000,
    caption: 'Export draft Hasil & Pembahasan siap-paste ke skripsi Anda.',
    cursor: { x: 65, y: 60, clickAt: 4000 },
    mockup: ({ progress }) => (
      <div className={styles.mockup}>
        <div className={styles.mockupCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <FileText style={{ width: 28, height: 28, color: 'var(--muted)' }} />
          {progress <= 0.3 ? (
            <div className={styles.exportBtn}>
              <Download style={{ width: 14, height: 14 }} />
              Export DOCX
            </div>
          ) : (
            <>
              <div className={styles.exportBtn} style={{ opacity: 0.6 }}>
                <Download style={{ width: 14, height: 14 }} />
                Export DOCX
              </div>
              <div className={styles.downloadNotice}>
                <Check style={{ width: 12, height: 12, color: 'rgb(var(--accent))' }} />
                data_hasil.docx terunduh
              </div>
            </>
          )}
        </div>
      </div>
    ),
  },
];

// Durasi array untuk useTimeline
export const SCENE_DURATIONS = SCENES.map((s) => s.durationMs);
export const TOTAL_DURATION = SCENE_DURATIONS.reduce((a, b) => a + b, 0);

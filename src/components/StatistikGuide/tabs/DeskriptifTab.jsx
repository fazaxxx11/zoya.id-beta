import { useState } from 'react';
import BellCurve from '../illustrations/BellCurve';
import SkewnessChart from '../illustrations/SkewnessChart';
import DeskriptifTutorial from './tutorials/DeskriptifTutorial';
import SpssTable from '../SpssTable';
import { DESCRIPTIVE_STATS, TESTS_OF_NORMALITY } from '../spssTableData';
import styles from '../StatistikGuide.module.css';
import useTabsKeyboard from '../useTabsKeyboard';

const DeskriptifTab = () => {
  const [showSpss, setShowSpss] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('materi');
  const subTabs = ['materi', 'tutorial'];
  const subIdx = subTabs.indexOf(activeSubTab);
  const { tabRefs, onKeyDown, getTabIndex } = useTabsKeyboard({
    count: subTabs.length,
    activeIndex: subIdx,
    onChange: (i) => setActiveSubTab(subTabs[i]),
  });

  return (
    <div>
      {/* Sub-tab toggle */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={styles.subTabRow}
        onKeyDown={onKeyDown}
      >
        <button
          role="tab"
          id="subtab-desk-materi"
          aria-selected={activeSubTab === 'materi'}
          aria-controls="subpanel-desk"
          tabIndex={getTabIndex(0)}
          ref={(el) => (tabRefs.current[0] = el)}
          onClick={() => setActiveSubTab('materi')}
          className={activeSubTab === 'materi' ? styles.subTabActive : styles.subTab}
        >
          📖 Materi
        </button>
        <button
          role="tab"
          id="subtab-desk-tutorial"
          aria-selected={activeSubTab === 'tutorial'}
          aria-controls="subpanel-desk"
          tabIndex={getTabIndex(1)}
          ref={(el) => (tabRefs.current[1] = el)}
          onClick={() => setActiveSubTab('tutorial')}
          className={activeSubTab === 'tutorial' ? styles.subTabActive : styles.subTab}
        >
          🎬 Tutorial
        </button>
      </div>

      <div
        role="tabpanel"
        id="subpanel-desk"
        aria-labelledby={`subtab-desk-${activeSubTab}`}
        tabIndex={0}
      >
        {activeSubTab === 'materi' && (
        <>
          {/* Section 1: Mean, Median, Modus */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Mean, Median &amp; Modus</h2>
            <p>
              Tiga ukuran tendensi sentral yang paling sering digunakan untuk merepresentasikan
              data dalam satu nilai tunggal.
            </p>

            <div className={styles.card} style={{ marginTop: 12 }}>
              <p><strong>Mean (Rata-rata)</strong></p>
              <code className={styles.formula}>x̄ = Σxᵢ / n</code>
              <p>Penjumlahan seluruh data dibagi jumlah data. Sensitif terhadap outlier.</p>
            </div>

            <div className={styles.card} style={{ marginTop: 12 }}>
              <p><strong>Median (Nilai Tengah)</strong></p>
              <code className={styles.formula}>Median = x₍ₙ₊₁₎/₂</code>
              <p>Nilai tengah saat data diurutkan. Tidak terpengaruh outlier.</p>
            </div>

            <div className={styles.card} style={{ marginTop: 12 }}>
              <p><strong>Modus (Nilai Paling Sering)</strong></p>
              <code className={styles.formula}>Modus = nilai dengan frekuensi tertinggi</code>
              <p>Cocok untuk data kategorikal. Bisa lebih dari satu modus.</p>
            </div>

            <div className={styles.highlight} style={{ marginTop: 12 }}>
              💡 <strong>Tips:</strong> Jika distribusi simetris, Mean ≈ Median ≈ Modus.
              Jika right-skewed, Mean &gt; Median &gt; Modus.
            </div>

            {/* SPSS Toggle */}
            <button
              className={styles.spssToggle}
              onClick={() => setShowSpss(!showSpss)}
            >
              📊 Lihat di SPSS {showSpss ? '▲' : '▼'}
            </button>

            {showSpss && (
              <div className={styles.spssPanel}>
                <SpssTable data={DESCRIPTIVE_STATS} />
                <SpssTable data={TESTS_OF_NORMALITY} />
                <p><strong>Cara di SPSS:</strong></p>
                <ol className={styles.spssSteps}>
                  <li>Klik menu <strong>Analyze</strong></li>
                  <li>Pilih <strong>Descriptive Statistics → Frequencies</strong></li>
                  <li>Drag variabel ke kolom <strong>Variable(s)</strong></li>
                  <li>Klik <strong>OK</strong></li>
                </ol>
                <div className={styles.highlight}>
                  📋 <strong>Output:</strong> Tabel <em>Statistics</em> menampilkan Mean, Median,
                  Mode, Std. Deviation, Variance, dan N. Bandingkan nilai Mean dan Median untuk
                  melihat skewness secara kasar.
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Bell Curve */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Distribusi Normal (Bell Curve)</h2>
            <p>
              Distribusi normal adalah distribusi probabilitas simetris berbentuk lonceng.
              Sebagian besar data terkonsentrasi di sekitar mean, dan semakin jauh dari mean,
              frekuensinya semakin kecil.
            </p>

            <div className={styles.illustration}>
              <BellCurve />
            </div>
            <p className={styles.illustrationCaption}>Kurva distribusi normal dengan Mean = Median = Mode</p>

            <p style={{ marginTop: 12 }}>
              Ciri-ciri distribusi normal:
            </p>
            <ul className={styles.bulletList}>
              <li>Simetris terhadap mean</li>
              <li>Mean = Median = Modus</li>
              <li>68% data dalam ±1 standar deviasi dari mean</li>
              <li>95% data dalam ±2 standar deviasi</li>
              <li>99.7% data dalam ±3 standar deviasi</li>
            </ul>
          </div>

          {/* Section 3: Skewness */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Skewness (Kemencengan)</h2>
            <p>
              Skewness mengukur seberapa simetris distribusi data. Distribusi yang tidak simetris
              disebut <em>skewed</em>.
            </p>

            <div className={styles.illustration}>
              <SkewnessChart />
            </div>
            <p className={styles.illustrationCaption}>Perbandingan distribusi normal, left-skewed, dan right-skewed</p>

            <div className={styles.card} style={{ marginTop: 12 }}>
              <p><strong>Right-Skewed (Positif)</strong></p>
              <p>Ekor panjang ke kanan. Mean &gt; Median. Contoh: distribusi gaji.</p>
            </div>

            <div className={styles.card} style={{ marginTop: 12 }}>
              <p><strong>Left-Skewed (Negatif)</strong></p>
              <p>Ekor panjang ke kiri. Mean &lt; Median. Contoh: usia pensiun.</p>
            </div>
          </div>
        </>
      )}

        {activeSubTab === 'tutorial' && <DeskriptifTutorial />}
      </div>
    </div>
  );
};

export default DeskriptifTab;

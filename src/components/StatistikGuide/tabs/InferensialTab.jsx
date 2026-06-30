import { useState } from 'react';
import PValueViz from '../illustrations/PValueViz';
import InferensialTutorial from './tutorials/InferensialTutorial';
import styles from '../StatistikGuide.module.css';
import useTabsKeyboard from '../useTabsKeyboard';

const InferensialTab = () => {
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
          id="subtab-inf-materi"
          aria-selected={activeSubTab === 'materi'}
          aria-controls="subpanel-inf"
          tabIndex={getTabIndex(0)}
          ref={(el) => (tabRefs.current[0] = el)}
          onClick={() => setActiveSubTab('materi')}
          className={activeSubTab === 'materi' ? styles.subTabActive : styles.subTab}
        >
          📖 Materi
        </button>
        <button
          role="tab"
          id="subtab-inf-tutorial"
          aria-selected={activeSubTab === 'tutorial'}
          aria-controls="subpanel-inf"
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
        id="subpanel-inf"
        aria-labelledby={`subtab-inf-${activeSubTab}`}
        tabIndex={0}
      >
        {activeSubTab === 'materi' && (
        <>
          {/* Section 1: H0 vs H1 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Hipotesis: H₀ vs H₁</h2>
            <p>
              Dalam uji hipotesis, kita membandingkan dua hipotesis yang saling bertentangan:
            </p>

            <div className={styles.card} style={{ marginTop: 12 }}>
              <p>
                <span className={styles.badge}>H₀</span>
                <strong>Hipotesis Nol</strong> — Tidak ada perbedaan atau pengaruh yang signifikan.
                Contoh: "Tidak ada perbedaan rata-rata skor antara kelompok A dan B."
              </p>
            </div>

            <div className={styles.card} style={{ marginTop: 12 }}>
              <p>
                <span className={styles.badge}>H₁</span>
                <strong>Hipotesis Alternatif</strong> — Ada perbedaan atau pengaruh yang signifikan.
                Contoh: "Ada perbedaan rata-rata skor antara kelompok A dan B."
              </p>
            </div>

            <div className={styles.highlight} style={{ marginTop: 12 }}>
              ⚠️ Kita tidak "membuktikan" H₁ — kita hanya menolak atau gagal menolak H₀.
            </div>
          </div>

          {/* Section 2: P-Value */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>P-Value &amp; Alpha (α)</h2>
            <p>
              P-value adalah probabilitas mendapatkan hasil yang sama ekstrem atau lebih ekstrem
              dari data yang diamati, <strong>jika H₀ benar</strong>.
            </p>

            <div className={styles.illustration}>
              <PValueViz alpha={0.05} />
            </div>
            <p className={styles.illustrationCaption}>Distribusi H₀ dengan region penolakan (α = 0.05)</p>

            <div className={styles.highlight} style={{ marginTop: 12 }}>
              <strong>Aturan keputusan:</strong>
              <br />
              Jika <strong>p &lt; 0.05</strong> → <strong>Tolak H₀</strong> (hasil signifikan)
              <br />
              Jika <strong>p ≥ 0.05</strong> → <strong>Gagal tolak H₀</strong> (hasil tidak signifikan)
            </div>
          </div>

          {/* Section 3: Jenis Uji */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Jenis-Jenis Uji Statistik</h2>
            <p>Pemilihan uji bergantung pada tipe data dan tujuan analisis:</p>

            <ul className={styles.bulletList}>
              <li><strong>t-test</strong> — Membandingkan rata-rata dua kelompok (independent atau paired)</li>
              <li><strong>Chi-Square (χ²)</strong> — Menguji hubungan antara dua variabel kategorikal</li>
              <li><strong>ANOVA</strong> — Membandingkan rata-rata tiga kelompok atau lebih</li>
              <li><strong>Mann-Whitney U</strong> — Alternatif t-test untuk data non-parametrik</li>
              <li><strong>Kruskal-Wallis</strong> — Alternatif ANOVA untuk data non-parametrik</li>
            </ul>

            {/* SPSS Toggle */}
            <button
              className={styles.spssToggle}
              onClick={() => setShowSpss(!showSpss)}
            >
              📊 Lihat di SPSS {showSpss ? '▲' : '▼'}
            </button>

            {showSpss && (
              <div className={styles.spssPanel}>
                <div className={styles.spssPlaceholder}>Output SPSS — Uji Hipotesis</div>

                <p><strong>Langkah-langkah t-test (Independent Samples):</strong></p>
                <ol className={styles.spssSteps}>
                  <li>Klik menu <strong>Analyze</strong></li>
                  <li>Pilih <strong>Compare Means → Independent Samples T Test</strong></li>
                  <li>Drag variabel dependen ke <strong>Test Variable(s)</strong></li>
                  <li>Drag variabel grouping ke <strong>Grouping Variable</strong></li>
                  <li>Klik <strong>Define Groups</strong>, masukkan nilai group (1 dan 2)</li>
                  <li>Klik <strong>OK</strong></li>
                </ol>

                <p style={{ marginTop: 12 }}><strong>Langkah-langkah ANOVA (One-Way):</strong></p>
                <ol className={styles.spssSteps}>
                  <li>Klik menu <strong>Analyze</strong></li>
                  <li>Pilih <strong>Compare Means → One-Way ANOVA</strong></li>
                  <li>Drag variabel dependen ke <strong>Dependent List</strong></li>
                  <li>Drag variabel faktor ke <strong>Factor</strong></li>
                  <li>Klik <strong>OK</strong></li>
                </ol>

                <div className={styles.highlight} style={{ marginTop: 12 }}>
                  📋 <strong>Output:</strong> Cari kolom <strong>Sig.</strong> pada tabel Independent
                  Samples Test atau ANOVA. Jika Sig. &lt; 0.05 → tolak H₀, perbedaan signifikan.
                  Nilai t atau F menunjukkan kekuatan perbedaan.
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Highlight box */}
          <div className={styles.section}>
            <div className={styles.rejectBox}>
              <strong>🎯 Inti Utama:</strong> Jika p-value &lt; 0.05, kita punya bukti yang cukup kuat
              untuk menolak hipotesis nol dan menyimpulkan bahwa ada perbedaan atau pengaruh
              yang signifikan secara statistik.
            </div>
          </div>
        </>
      )}

        {activeSubTab === 'tutorial' && <InferensialTutorial />}
      </div>
    </div>
  );
};

export default InferensialTab;

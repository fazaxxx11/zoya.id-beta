import { useState } from 'react';
import ScatterLine from '../illustrations/ScatterLine';
import RegresiTutorial from './tutorials/RegresiTutorial';
import SpssTable from '../SpssTable';
import { MODEL_SUMMARY, COEFFICIENTS } from '../spssTableData';
import styles from '../StatistikGuide.module.css';
import useTabsKeyboard from '../useTabsKeyboard';

const RegresiTab = () => {
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
          id="subtab-reg-materi"
          aria-selected={activeSubTab === 'materi'}
          aria-controls="subpanel-reg"
          tabIndex={getTabIndex(0)}
          ref={(el) => (tabRefs.current[0] = el)}
          onClick={() => setActiveSubTab('materi')}
          className={activeSubTab === 'materi' ? styles.subTabActive : styles.subTab}
        >
          📖 Materi
        </button>
        <button
          role="tab"
          id="subtab-reg-tutorial"
          aria-selected={activeSubTab === 'tutorial'}
          aria-controls="subpanel-reg"
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
        id="subpanel-reg"
        aria-labelledby={`subtab-reg-${activeSubTab}`}
        tabIndex={0}
      >
        {activeSubTab === 'materi' && (
        <>
          {/* Section 1: Penjelasan + Rumus */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Regresi Linear Sederhana</h2>
            <p>
              Regresi linear adalah metode untuk memodelkan hubungan antara satu variabel
              independen (X) dengan variabel dependen (Y). Tujuannya adalah menemukan garis
              terbaik yang mendekati seluruh titik data.
            </p>

            <div className={styles.card} style={{ marginTop: 12 }}>
              <p><strong>Rumus Regresi Linear:</strong></p>
              <code className={styles.formula}>Y = a + bX</code>
              <ul className={styles.bulletList} style={{ marginTop: 8 }}>
                <li><strong>Y</strong> = variabel dependen (predicted value)</li>
                <li><strong>a</strong> = intercept (nilai Y saat X = 0)</li>
                <li><strong>b</strong> = koefisien regresi (slope / kemiringan garis)</li>
                <li><strong>X</strong> = variabel independen</li>
              </ul>
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
                <SpssTable data={MODEL_SUMMARY} />
                <SpssTable data={COEFFICIENTS} />
                <p><strong>Cara di SPSS:</strong></p>
                <ol className={styles.spssSteps}>
                  <li>Klik menu <strong>Analyze</strong></li>
                  <li>Pilih <strong>Regression → Linear</strong></li>
                  <li>Drag variabel dependen (Y) ke <strong>Dependent</strong></li>
                  <li>Drag variabel independen (X) ke <strong>Independent(s)</strong></li>
                  <li>Pilih method <strong>Enter</strong> (default)</li>
                  <li>Klik <strong>OK</strong></li>
                </ol>
                <div className={styles.highlight} style={{ marginTop: 12 }}>
                  📋 <strong>Output:</strong> Cek dua tabel utama:
                  <br />• <strong>Coefficients</strong> — kolom B (intercept &amp; slope), Std. Error, Sig.
                  <br />• <strong>Model Summary</strong> — R, R Square (R²), Adjusted R Square
                  <br /><br />
                  Nilai <strong>Sig.</strong> pada Coefficients harus &lt; 0.05 agar koefisien signifikan.
                  <strong>R²</strong> menunjukkan berapa persen variasi Y yang dijelaskan oleh X.
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Scatter + Regresi Line */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Visualisasi: Scatter Plot &amp; Garis Regresi</h2>
            <p>
              Scatter plot menampilkan hubungan antara dua variabel. Garis regresi menunjukkan
              tren linear terbaik dari data.
            </p>

            <div className={styles.illustration}>
              <ScatterLine />
            </div>
            <p className={styles.illustrationCaption}>Scatter plot dengan garis regresi linear</p>
          </div>

          {/* Section 3: Interpretasi */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Interpretasi Koefisien</h2>

            <div className={styles.card}>
              <p><strong>Koefisien Regresi (b = 0.75)</strong></p>
              <p>
                Setiap peningkatan 1 unit X, nilai Y diprediksi naik sebesar 0.75 unit.
                Karena b positif, hubungan antara X dan Y bersifat positif (searah).
              </p>
            </div>

            <div className={styles.card} style={{ marginTop: 12 }}>
              <p><strong>R² = 0.94 (Koefisien Determinasi)</strong></p>
              <p>
                94% variasi dalam variabel Y dapat dijelaskan oleh variabel X.
                Sisanya (6%) dipengaruh oleh faktor lain yang tidak dimasukkan dalam model.
              </p>
              <ul className={styles.bulletList} style={{ marginTop: 8 }}>
                <li>R² = 0.0 → model tidak menjelaskan variasi sama sekali</li>
                <li>R² = 1.0 → model menjelaskan seluruh variasi</li>
                <li>R² &gt; 0.7 → model cukup baik</li>
              </ul>
            </div>
          </div>

          {/* Section 4: Asumsi Regresi */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>4 Asumsi Regresi Linear</h2>

            <div className={styles.card}>
              <ol className={styles.bulletList} style={{ listStyleType: 'decimal', paddingLeft: 20 }}>
                <li>
                  <strong>Linearitas</strong> — Hubungan antara X dan Y bersifat linear.
                  Cek dengan residual plot.
                </li>
                <li style={{ marginTop: 8 }}>
                  <strong>Homoskedastisitas</strong> — Variansi residual konstan di semua level X.
                  Cek dengan plot residual vs fitted.
                </li>
                <li style={{ marginTop: 8 }}>
                  <strong>Normalitas Residual</strong> — Residual berdistribusi normal.
                  Cek dengan histogram atau Shapiro-Wilk test.
                </li>
                <li style={{ marginTop: 8 }}>
                  <strong>Independensi Residual</strong> — Residual tidak saling berkorelasi.
                  Cek dengan Durbin-Watson test.
                </li>
              </ol>
            </div>
          </div>
        </>
      )}

        {activeSubTab === 'tutorial' && <RegresiTutorial />}
      </div>
    </div>
  );
};

export default RegresiTab;

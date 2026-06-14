import FlowChart from '../illustrations/FlowChart';
import styles from '../StatistikGuide.module.css';

const OverviewTab = () => (
  <div>
    {/* Flowchart */}
    <div className={styles.section}>
      <div className={styles.illustration}>
        <FlowChart />
      </div>
      <p className={styles.illustrationCaption}>Alur pemilihan analisis statistik</p>
    </div>

    {/* Intro */}
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Apa itu Statistika?</h2>
      <p>
        Statistika adalah cabang ilmu yang berhubungan dengan pengumpulan, pengolahan,
        analisis, dan interpretasi data. Dalam penelitian, statistika membantu kita
        mengambil kesimpulan yang valide dari data yang tersedia.
      </p>
      <p>
        Secara garis besar, analisis statistika terbagi menjadi tiga kategori utama:
      </p>
    </div>

    {/* 3 Cards */}
    <div className={styles.cardGrid}>
      <div className={styles.card}>
        <div className={styles.cardIcon}>📊</div>
        <div className={styles.cardTitle}>Deskriptif</div>
        <div className={styles.cardDesc}>
          Mendeskripsikan dan merangkum data menggunakan mean, median, modus,
          standar deviasi, dan visualisasi grafik.
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardIcon}>🔬</div>
        <div className={styles.cardTitle}>Inferensial</div>
        <div className={styles.cardDesc}>
          Mengambil kesimpulan tentang populasi berdasarkan sampel menggunakan
          uji hipotesis, confidence interval, dan p-value.
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardIcon}>📈</div>
        <div className={styles.cardTitle}>Regresi</div>
        <div className={styles.cardDesc}>
          Memprediksi nilai variabel dependen berdasarkan variabel independen
          menggunakan model linear atau multivariate.
        </div>
      </div>
    </div>
  </div>
);

export default OverviewTab;

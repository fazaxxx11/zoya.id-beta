import { useState } from 'react';
import styles from '../StatistikGuide.module.css';

const faqs = [
  {
    q: 'Kapan pakai t-test vs ANOVA?',
    a: 'Pakai t-test jika membandingkan rata-rata dua kelompok. Pakai ANOVA jika membandingkan tiga kelompok atau lebih. ANOVA pada dasarnya adalah generalisasi t-test untuk lebih dari dua kelompok.',
  },
  {
    q: 'Apa beda korelasi vs regresi?',
    a: 'Korelasi mengukur kekuatan dan arah hubungan antara dua variabel (r). Regresi memodelkan hubungan tersebut untuk memprediksi nilai (Y = a + bX). Korelasi tidak menyebabkan prediksi, regresi bisa.',
  },
  {
    q: 'Kapan pakai uji parametrik vs non-parametrik?',
    a: 'Pakai parametrik (t-test, ANOVA) jika data berdistribusi normal. Pakai non-parametrik (Mann-Whitney, Kruskal-Wallis) jika data tidak normal, berbentuk ordinal, atau ukuran sampel kecil.',
  },
  {
    q: 'Bagaimana cara mengetahui data berdistribusi normal?',
    a: 'Gunakan uji Shapiro-Wilk (paling sensitif untuk sampel kecil), uji Kolmogorov-Smirnov, atau lihat Q-Q plot. Jika p-value > 0.05, data dianggap normal.',
  },
  {
    q: 'Apa itu p-value dan bagaimana cara membacanya?',
    a: 'P-value adalah probabilitas mendapatkan hasil setidaknya sama ekstrem dari data, jika H₀ benar. Semakin kecil p-value, semakin kuat bukti menolak H₀. Threshold umum: α = 0.05.',
  },
  {
    q: 'Apa beda one-tailed vs two-tailed test?',
    a: 'Two-tailed test mendeteksi perbedaan ke dua arah (lebih besar ATAU lebih kecil). One-tailed test hanya mendeteksi ke satu arah. Gunakan two-tailed jika tidak yakin arah perbedaan.',
  },
  {
    q: 'Bagaimana cara menangani missing data?',
    a: 'Pilihan: (1) Listwise deletion — hapus baris dengan missing. (2) Pairwise deletion — hapus per analisis. (3) Imputation — isi dengan mean/median/regresi. (4) Multiple imputation — metode paling robust.',
  },
  {
    q: 'Apa itu effect size dan kenapa penting?',
    a: 'Effect size mengukur seberapa besar perbedaan atau hubungan yang terjadi, terlepas dari ukuran sampel. Contoh: Cohen\'s d untuk t-test, η² untuk ANOVA. P-value saja tidak cukup — effect size menunjukkan signifikansi praktis.',
  },
];

const FAQTab = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <div>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Pertanyaan Umum Statistika</h2>
        <p style={{ marginBottom: 16 }}>
          Klik pertanyaan untuk melihat jawaban.
        </p>
      </div>

      <div>
        {faqs.map((faq, i) => (
          <div key={i} className={styles.accordionItem} onClick={() => toggle(i)}>
            <div className={styles.accordionQuestion}>
              <span>{faq.q}</span>
              <span
                className={`${styles.accordionArrow} ${
                  openIndex === i ? styles.accordionArrowOpen : ''
                }`}
              >
                ▼
              </span>
            </div>
            {openIndex === i && (
              <div className={styles.accordionAnswer}>{faq.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQTab;

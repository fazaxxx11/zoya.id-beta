import { useState } from 'react';
import PageHeader from '../PageHeader';
import { STATISTIK_SUBNAV } from '../../lib/statistikNav';
import styles from './StatistikGuide.module.css';

import OverviewTab from './tabs/OverviewTab';
import DeskriptifTab from './tabs/DeskriptifTab';
import InferensialTab from './tabs/InferensialTab';
import RegresiTab from './tabs/RegresiTab';
import FAQTab from './tabs/FAQTab';

const tabs = [
  { id: 'overview', label: 'Ringkasan', component: OverviewTab },
  { id: 'deskriptif', label: 'Deskriptif', component: DeskriptifTab },
  { id: 'inferensial', label: 'Inferensial', component: InferensialTab },
  { id: 'regresi', label: 'Regresi', component: RegresiTab },
  { id: 'faq', label: 'FAQ', component: FAQTab },
];

const StatistikGuide = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component || OverviewTab;

  return (
    <div className="min-h-screen bg-bg text-fg pb-bottomnav">
      <PageHeader
        title="Pelajari tiap uji"
        eyebrow="STATISTIK · PANDUAN"
        tagline="Referensi: kapan pakai, rumus, & bacaan output."
        variant="hero"
        accent="gold"
        parentPath="/statistik"
        parentLabel="Statistik"
        subNav={STATISTIK_SUBNAV}
      />

      <div className={styles.container}>
        <p className={styles.subtitle}>Referensi lengkap analisis data untuk penelitian</p>

        <nav className={styles.tabNav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <ActiveComponent />
      </div>
    </div>
  );
};

export default StatistikGuide;

import { useState } from 'react';
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
    <div className={styles.container}>
      <h1 className={styles.title}>Panduan Statistika</h1>
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
  );
};

export default StatistikGuide;

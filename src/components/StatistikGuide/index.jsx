import { useState } from 'react';
import PageHeader from '../PageHeader';
import { STATISTIK_SUBNAV } from '../../lib/statistikNav';
import styles from './StatistikGuide.module.css';
import useTabsKeyboard from './useTabsKeyboard';

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
  const activeIdx = tabs.findIndex((t) => t.id === activeTab);
  const ActiveComponent = tabs[activeIdx]?.component || OverviewTab;
  const { tabRefs, onKeyDown, getTabIndex } = useTabsKeyboard({
    count: tabs.length,
    activeIndex: activeIdx,
    onChange: (i) => setActiveTab(tabs[i].id),
  });

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

        <nav
          role="tablist"
          aria-orientation="horizontal"
          className={styles.tabNav}
          onKeyDown={onKeyDown}
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={getTabIndex(i)}
              ref={(el) => (tabRefs.current[i] = el)}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default StatistikGuide;

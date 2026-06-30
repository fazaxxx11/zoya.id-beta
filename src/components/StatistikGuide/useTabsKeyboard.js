import { useRef } from 'react';

/**
 * Pure logic: tentukan index tab berikutnya dari key keyboard.
 * Dipisah dari hook supaya unit-testable di node env tanpa DOM.
 *
 * @param {string} key   - e.key
 * @param {number} activeIndex
 * @param {number} count
 * @returns {number|null} index tujuan, atau null jika key bukan navigasi
 */
export function getNextTab(key, activeIndex, count) {
  if (!count) return null;
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return (activeIndex + 1) % count;
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return (activeIndex - 1 + count) % count;
  }
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

/**
 * WAI-ARIA tabs keyboard helper (automatic activation).
 * Roving tabindex + Arrow Left/Right/Up/Down + Home/End + focus management.
 *
 * @param {object} opts
 * @param {number} opts.count       - jumlah tab
 * @param {number} opts.activeIndex - index tab aktif saat ini
 * @param {(i:number)=>void} opts.onChange - dipanggil saat tab berubah via keyboard
 * @returns {{tabRefs: React.MutableRefObject<Array>, onKeyDown: Function, getTabIndex: Function}}
 */
export default function useTabsKeyboard({ count, activeIndex, onChange }) {
  const tabRefs = useRef([]);

  if (!count) {
    return { tabRefs, onKeyDown: () => {}, getTabIndex: () => -1 };
  }

  const focusTab = (i) => {
    tabRefs.current[i]?.focus?.();
  };

  const onKeyDown = (e) => {
    const next = getNextTab(e.key, activeIndex, count);
    if (next === null) return; // jangan intercept key non-navigasi
    e.preventDefault();
    if (next !== activeIndex) {
      onChange(next);
      focusTab(next);
    }
  };

  const getTabIndex = (i) => (i === activeIndex ? 0 : -1);

  return { tabRefs, onKeyDown, getTabIndex };
}

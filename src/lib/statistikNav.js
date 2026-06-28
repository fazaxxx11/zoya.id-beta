// Single source of truth untuk sub-navigation Modul Statistik.
// Dipakai oleh PageHeader.subNav di semua subpage Statistik.
// Hindari drift antar file (sebelumnya hanya Statistik.jsx yang punya tab bar).

import {
  Activity, Layers, Sigma, Clock, FileText, BookOpen, HelpCircle, LayoutGrid,
} from 'lucide-react'

export const STATISTIK_SUBNAV = [
  { path: '/statistik',         label: 'Analisis',    icon: Activity },
  { path: '/statistik/batch',   label: 'Batch',       icon: Layers },
  { path: '/statistik/power',   label: 'Power',       icon: Sigma },
  { path: '/statistik/history', label: 'Riwayat',     icon: Clock },
  { path: '/statistik/report',  label: 'Bab IV',      icon: FileText },
  { path: '/statistik/start',   label: 'Panduan',     icon: BookOpen },
  { path: '/statistik/guide',   label: 'Dokumentasi', icon: HelpCircle },
  { path: '/eviews',            label: 'EViews',      icon: LayoutGrid },
]

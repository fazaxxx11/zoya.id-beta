import { DataTable } from '../design';

function sigStars(p) {
  if (p < 0.01) return '***';
  if (p < 0.05) return '**';
  if (p < 0.10) return '*';
  return '';
}

export default function CoefficientsTable({ result }) {
  if (!result?.beta) return null;

  const names = result.coefNames || result.beta.map((_, i) => i === 0 ? '(Intercept)' : `X${i}`);
  const rows = names.map((name, i) => ({
    variable: name,
    beta: result.beta[i],
    se: result.se?.[i],
    t: result.tValues?.[i],
    p: result.pValues?.[i],
    sig: sigStars(result.pValues?.[i]),
  }));

  const columns = [
    { key: 'variable', header: 'Variabel', className: 'font-medium' },
    { key: 'beta', header: 'β', align: 'right', mono: true, render: v => v?.toFixed(4) },
    { key: 'se', header: 'SE', align: 'right', mono: true, render: v => v?.toFixed(4) },
    { key: 't', header: 't', align: 'right', mono: true, render: v => v?.toFixed(3) },
    { key: 'p', header: 'p', align: 'right', mono: true, render: v => v?.toFixed(4) },
    { key: 'sig', header: '', align: 'center', render: v => (
      <span className="text-primary font-bold">{v}</span>
    )},
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
        Koefisien
        <span className="text-xs font-normal text-muted">*** p&lt;0.01, ** p&lt;0.05, * p&lt;0.10</span>
      </h3>
      <DataTable columns={columns} data={rows} compact />
    </div>
  );
}

'use client';

import { useEffect } from 'react';

function cellValue(cell: HTMLTableCellElement) {
  const clone = cell.cloneNode(true) as HTMLTableCellElement;
  clone.querySelectorAll('button, [data-export-ignore], svg').forEach((node) => node.remove());
  clone.querySelectorAll('input, select, textarea').forEach((node) => {
    const control = node as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const value = control instanceof HTMLInputElement && control.type === 'checkbox'
      ? (control.checked ? 'Yes' : 'No')
      : control.value;
    node.replaceWith(document.createTextNode(value || ''));
  });
  return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
}

function csvEscape(value: string) {
  // Prevent spreadsheet formula injection while preserving ordinary values.
  const safe = /^[\s]*[=+@]/.test(value) || /^[\s]*-[0-9]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function exportTable(table: HTMLTableElement) {
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) => {
      if (cell.querySelector('button') || cell.hasAttribute('data-export-ignore')) return '';
      return cellValue(cell);
    })
  );
  const csv = '\uFEFF' + rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const title = (table.closest('[data-table-title]')?.getAttribute('data-table-title')
    || document.title || 'NOS-table').trim();
  link.href = url;
  link.download = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function TableExportEnhancer() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/print/')) return;

    const enhance = () => {
      document.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
        if (table.dataset.noExport === 'true' || table.dataset.exportEnhanced === 'true') return;
        table.dataset.exportEnhanced = 'true';

        const toolbar = document.createElement('div');
        toolbar.setAttribute('data-table-export-toolbar', 'true');
        toolbar.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;align-items:center;margin:6px 0;padding:2px 0;flex-wrap:wrap;';
        const exportButton = document.createElement('button');
        exportButton.type = 'button';
        exportButton.textContent = '⬇ Export CSV / Excel';
        exportButton.title = 'Export this table to a CSV file compatible with Excel';
        exportButton.style.cssText = 'border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1e293b;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;';
        exportButton.addEventListener('click', () => exportTable(table));
        const count = document.createElement('span');
        count.textContent = table.tBodies.length
          ? table.tBodies[0].rows.length.toLocaleString() + ' rows'
          : Math.max(0, table.rows.length - 1).toLocaleString() + ' rows';
        count.style.cssText = 'font-size:11px;color:#64748b;';
        toolbar.append(exportButton, count);
        table.parentElement?.insertBefore(toolbar, table);
      });
    };

    enhance();
    const observer = new MutationObserver(() => enhance());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

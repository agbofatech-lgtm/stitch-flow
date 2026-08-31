import { ExperienceEmptyState } from './feedback';

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => string;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  caption,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  caption: string;
}) {
  if (rows.length === 0) {
    return <ExperienceEmptyState title="No rows" description="There is nothing to show in this table yet." />;
  }

  return (
    <div className="overflow-x-auto rounded-sf-lg border border-line">
      <table className="min-w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-workspace text-label text-ink-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="px-4 py-3 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-line text-body text-ink-primary">
              {columns.map((column) => (
                <td key={column.id} className="px-4 py-3 font-numeric">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

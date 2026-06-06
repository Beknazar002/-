import { Rental } from '../types';

export function exportRentalsToCSV(rentals: Rental[]) {
  // Delimiter for European/Russian Excel is typically semicolon ';'
  const delimiter = ';';
  
  const headers = [
    'ID аренды',
    'Имя клиента',
    'Телефон',
    'Инструмент',
    'Дата начала',
    'Планируемый возврат',
    'Фактический возврат',
    'Общая стоимость (руб)',
    'Статус'
  ];

  const rows = rentals.map(r => {
    return [
      r.id,
      r.clientName.replace(/;/g, ' '),
      r.clientPhone.replace(/;/g, ' '),
      r.toolName.replace(/;/g, ' '),
      r.startDate,
      r.endDate,
      r.returnedAt ? new Date(r.returnedAt).toLocaleDateString('ru-RU') : 'Не возвращен',
      r.totalPrice.toString(),
      r.status === 'active' ? 'Активна' : r.status === 'returned' ? 'Возвращен' : 'Просрочен'
    ];
  });

  const csvContent = [
    headers.join(delimiter),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(delimiter))
  ].join('\n');

  // Excel needs UTF-8 BOM to display Russian text correctly
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tool_rental_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

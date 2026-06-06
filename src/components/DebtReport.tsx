import React from 'react';
import { AlertTriangle, TrendingUp, UserX, Download, Phone, ShieldX } from 'lucide-react';
import { Rental, Tool } from '../types';

interface DebtReportProps {
  rentals: Rental[];
  tools: Tool[];
  onTriggerNotification: (rental: Rental) => void;
}

export default function DebtReport({ rentals, tools, onTriggerNotification }: DebtReportProps) {
  // Overdue rentals are those containing a class status of 'overdue' or endDate in the past with status !== 'returned'
  const today = new Date();
  today.setHours(0,0,0,0);

  const debtors = rentals.filter(r => {
    if (r.status === 'returned') return false;
    const end = new Date(r.endDate);
    end.setHours(0,0,0,0);
    return today > end || r.status === 'overdue';
  });

  // Calculate accumulated late days and debt sum
  const detailedDebtors = debtors.map(r => {
    const end = new Date(r.endDate);
    end.setHours(0,0,0,0);
    const diffTime = today.getTime() - end.getTime();
    const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const tool = tools.find(t => t.id === r.toolId);
    const pricePerDay = tool ? tool.pricePerDay : 800;
    // Standard accumulated debt = days late * day price * 1.5 penalty factor
    const penaltyRate = 1.5;
    const accumulatedDebt = daysLate * pricePerDay * penaltyRate;

    return {
      ...r,
      daysLate,
      pricePerDay,
      accumulatedDebt,
      toolModel: tool ? tool.name : r.toolName,
      serialNumber: tool ? tool.serialNumber : 'N/A'
    };
  });

  const totalOutstandingDebt = detailedDebtors.reduce((acc, current) => acc + current.accumulatedDebt, 0);

  const handleExportDebtorsCSV = () => {
    const delimiter = ';';
    const headers = [
      'Имя Должника',
      'Телефон',
      'Просроченный инструмент',
      'Серийный номер',
      'Дата выдачи',
      'Должен вернуть',
      'Дней просрочки',
      'Тариф в день (руб)',
      'Сумма задолженности с пеней (руб)'
    ];

    const rows = detailedDebtors.map(d => [
      d.clientName.replace(/;/g, ' '),
      d.clientPhone.replace(/;/g, ' '),
      d.toolName.replace(/;/g, ' '),
      d.serialNumber,
      d.startDate,
      d.endDate,
      d.daysLate.toString(),
      d.pricePerDay.toString(),
      d.accumulatedDebt.toString()
    ]);

    const csvContent = [
      headers.join(delimiter),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(delimiter))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `debtors_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Отчеты по задолженности
            </h2>
            <p className="text-sm text-slate-500">
              Выявляйте недобросовестных клиентов, рассчитывайте штрафы и сохраняйте отчеты
            </p>
          </div>

          {detailedDebtors.length > 0 && (
            <button
              id="export-debtors-csv-btn"
              onClick={handleExportDebtorsCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              Экспорт должников в Excel
            </button>
          )}
        </div>

        {/* Dashboard Debt Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-5 border border-rose-100 rounded-2xl bg-rose-50/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-500 block">Пеня за просрочку (Всего)</span>
              <h3 className="text-2xl font-bold text-rose-700 mt-1">{totalOutstandingDebt.toLocaleString('ru-RU')} ₽</h3>
              <p className="text-xs text-rose-600 mt-1">Рассчитывается как тариф × задержка × 1.5</p>
            </div>
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Клиентов на задержке</span>
              <h3 className="text-2xl font-semibold text-slate-800 mt-1">{detailedDebtors.length} человек</h3>
              <p className="text-xs text-slate-400 mt-1">Ожидающих звонка или отправки СМС</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-500 rounded-xl">
              <UserX className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Вне задержек</span>
              <h3 className="text-2xl font-semibold text-slate-800 mt-1">
                {(rentals.filter(r => r.status === 'active').length - detailedDebtors.length)} активных
              </h3>
              <p className="text-xs text-slate-400 mt-1">Срок возврата по договорам еще не истек</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Phone className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Debtors List Table */}
        {detailedDebtors.length > 0 ? (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="min-w-full divide-y divide-slate-100 text-left border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">ФИО Должника</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Телефон для связи</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Невозвращенный инструмент</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Серийный номер</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Срок договора</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Просрочка</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right text-rose-600">Штраф + Аренда</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs font-medium">
                {detailedDebtors.map(debtor => (
                  <tr key={debtor.id} className="hover:bg-rose-50/10">
                    <td className="p-3 font-bold text-slate-900">{debtor.clientName}</td>
                    <td className="p-3 text-slate-600">{debtor.clientPhone}</td>
                    <td className="p-3">
                      <div className="font-bold text-indigo-950">{debtor.toolName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {debtor.toolId.slice(0, 8)}</div>
                    </td>
                    <td className="p-3 text-slate-600 font-mono">{debtor.serialNumber}</td>
                    <td className="p-3 text-slate-500">
                      с {debtor.startDate} по <span className="text-rose-600 font-bold">{debtor.endDate}</span>
                    </td>
                    <td className="p-3 font-bold text-rose-700">
                      {debtor.daysLate} дн.
                    </td>
                    <td className="p-3 text-right font-bold text-rose-700">
                      {debtor.accumulatedDebt.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
            <ShieldX className="w-10 h-10 text-slate-300 mb-2" />
            <h4 className="font-bold text-slate-800 mb-0.5">Должников не обнаружено</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Все инструменты либо своевременно возвращены, либо находятся у клиентов в законных действующих сроках проката.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

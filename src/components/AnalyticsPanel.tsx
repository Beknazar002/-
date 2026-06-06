import React from 'react';
import { BarChart3, TrendingUp, Hammer, CalendarRange, Download } from 'lucide-react';
import { Rental, Tool } from '../types';
import { exportRentalsToCSV } from '../utils/export';

interface AnalyticsPanelProps {
  rentals: Rental[];
  tools: Tool[];
}

export default function AnalyticsPanel({ rentals, tools }: AnalyticsPanelProps) {
  // Aggregate revenue by Category
  const categoryStats: { [cat: string]: { count: number; revenue: number } } = {
    'Электроинструменты': { count: 0, revenue: 0 },
    'Ручные инструменты': { count: 0, revenue: 0 },
    'Садовая техника': { count: 0, revenue: 0 },
    'Строительное оборудование': { count: 0, revenue: 0 },
  };

  rentals.forEach(rental => {
    // Find associated tool's category
    const tool = tools.find(t => t.id === rental.toolId || t.name === rental.toolName);
    const category = tool ? tool.category : 'Электроинструменты';
    
    if (categoryStats[category]) {
      categoryStats[category].count += 1;
      categoryStats[category].revenue += rental.totalPrice;
    } else {
      categoryStats[category] = { count: 1, revenue: rental.totalPrice };
    }
  });

  const aggregateData = Object.entries(categoryStats).map(([category, info]) => ({
    category,
    ...info,
  }));

  const maxRevenue = Math.max(...aggregateData.map(d => d.revenue), 1);
  const totalRevSum = rentals.reduce((sum, r) => sum + r.totalPrice, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Аналитика проката и продаж
          </h2>
          <p className="text-sm text-slate-500">
            Оборот по категориям оборудования и экспорт общей базы в Excel
          </p>
        </div>

        <button
          id="export-analytics-csv-btn"
          onClick={() => exportRentalsToCSV(rentals)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Экспорт аналитики (Excel CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SVG/Tailwind Category revenue breakdown */}
        <div className="p-5 border border-slate-100 rounded-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Оборот по категориям</h3>
          <div className="space-y-4">
            {aggregateData.map(item => {
              const percentageOfMax = (item.revenue / maxRevenue) * 100;
              const percentageOfTotal = totalRevSum > 0 ? (item.revenue / totalRevSum) * 100 : 0;
              
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.category}</span>
                    <span className="text-slate-900 font-bold">
                      {item.revenue.toLocaleString('ru-RU')} ₽ <span className="text-[10px] text-slate-400">({percentageOfTotal.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentageOfMax}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Кол-во сделок аренды: {item.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sales & Efficiency summary stats */}
        <div className="p-5 border border-slate-100 rounded-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Сводные показатели эффективности</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block">Средний чек сделки</span>
                  <span className="text-slate-600 font-semibold">
                    {rentals.length > 0 
                      ? `${Math.round(totalRevSum / rentals.length).toLocaleString('ru-RU')} ₽` 
                      : '0 ₽'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                <CalendarRange className="w-4 h-4 text-slate-500" />
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block">Всего закрытых договоров</span>
                  <span className="text-slate-600 font-semibold">
                    {rentals.filter(r => r.status === 'returned').length} сделок
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                <Hammer className="w-4 h-4 text-slate-500" />
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block">Коэффициент загрузки парка</span>
                  <span className="text-slate-600 font-semibold">
                    {tools.length > 0 
                      ? `${Math.round((tools.filter(t => t.status === 'rented').length / tools.length) * 100)} %` 
                      : '0 %'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100/80 leading-relaxed text-center font-medium">
            💡 Нажмите <strong>Экспорт аналитики</strong> для скачивания файла Excel (CSV), содержащего детальные записи по всем прокатам для построения квартальных отчетов.
          </div>
        </div>
      </div>
    </div>
  );
}

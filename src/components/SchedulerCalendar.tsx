import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ListCollapse, GanttChartSquare } from 'lucide-react';
import { Tool, Rental } from '../types';

interface SchedulerCalendarProps {
  tools: Tool[];
  rentals: Rental[];
}

export default function SchedulerCalendar({ tools, rentals }: SchedulerCalendarProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper: Get days of current month
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const daysCount = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  const monthNamesRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to check if a tool is rented on a specific date
  const getRentalForDate = (toolId: string, day: number) => {
    const queryDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const queryDate = new Date(queryDateStr);

    return rentals.find(rental => {
      if (rental.toolId !== toolId) return false;
      const start = new Date(rental.startDate);
      const end = new Date(rental.endDate);
      
      // Reset times to compare dates
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      queryDate.setHours(0,0,0,0);

      return queryDate >= start && queryDate <= end;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
            Календарь доступности инвентаря
          </h2>
          <p className="text-sm text-slate-500">
            Проверяйте свободные даты и график загруженности инструментов
          </p>
        </div>

        {/* View Mode & Month nav */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              id="view-timeline-btn"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GanttChartSquare className="w-3.5 h-3.5" />
              Шкала времени
            </button>
            <button
              id="view-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListCollapse className="w-3.5 h-3.5" />
              Сетка дней
            </button>
          </div>

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              id="calendar-prev-btn"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-md transition text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-2 min-w-[100px] text-center">
              {monthNamesRu[month]} {year}
            </span>
            <button
              id="calendar-next-btn"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-md transition text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Render Main View */}
      {viewMode === 'timeline' ? (
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="min-w-full divide-y divide-slate-100 text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="sticky left-0 bg-slate-50 p-3 text-xs font-bold text-slate-500 w-[240px] border-r border-slate-150 z-10">
                  Инструмент / Дни месяца
                </th>
                {daysArray.map(day => {
                  const dayOfWeek = new Date(year, month, day).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  return (
                    <th
                      key={day}
                      className={`p-2 text-center text-xs font-bold border-r border-slate-100 min-w-[36px] ${
                        isWeekend ? 'bg-indigo-50/50 text-indigo-600' : 'text-slate-600'
                      }`}
                    >
                      {day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 bg-white">
              {tools.map(tool => (
                <tr key={tool.id} className="hover:bg-slate-50/50">
                  <td className="sticky left-0 bg-white hover:bg-slate-50 p-3 text-xs font-semibold text-slate-800 w-[240px] border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10">
                    <div className="font-bold truncate">{tool.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      S/N: {tool.serialNumber} • <span className={`${tool.status === 'maintenance' ? 'text-amber-500' : 'text-emerald-500'}`}>{tool.status === 'maintenance' ? 'В ремонте' : 'Активен'}</span>
                    </div>
                  </td>
                  {daysArray.map(day => {
                    const rental = getRentalForDate(tool.id, day);
                    const dayOfWeek = new Date(year, month, day).getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    if (tool.status === 'maintenance') {
                      return (
                        <td
                          key={day}
                          className="p-1 border-r border-slate-100 bg-amber-50/30 text-center"
                          title="Техническое обслуживание"
                        >
                          <div className="w-full h-6 bg-amber-100 border border-amber-200 rounded-sm" />
                        </td>
                      );
                    }

                    if (rental) {
                      const isStart = new Date(rental.startDate).getDate() === day && new Date(rental.startDate).getMonth() === month;
                      const isEnd = new Date(rental.endDate).getDate() === day && new Date(rental.endDate).getMonth() === month;
                      const isOverdue = rental.status === 'overdue';

                      return (
                        <td
                          key={day}
                          className={`p-1 border-r border-slate-100 text-center cursor-pointer ${
                            isOverdue ? 'bg-rose-50/20' : 'bg-emerald-50/20'
                          }`}
                          title={`Арендовано: ${rental.clientName}\nСрок: ${rental.startDate} - ${rental.endDate}`}
                        >
                          <div
                            className={`h-6 text-[10px] font-bold text-white flex items-center justify-center rounded-xs truncate px-1 shadow-xs transition-transform hover:scale-105 ${
                              isOverdue
                                ? 'bg-rose-500 border border-rose-600'
                                : 'bg-indigo-600 border border-indigo-700'
                            }`}
                          >
                            {isStart && '🚪'}
                            {isEnd && '📦'}
                            {!isStart && !isEnd && '•'}
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={day}
                        className={`p-1 border-r border-slate-100 text-center ${
                          isWeekend ? 'bg-slate-50/40' : ''
                        }`}
                      >
                        <div className="h-6 w-full border border-dashed border-slate-200 hover:border-indigo-400 rounded-sm transition-all duration-150" />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid calendar format showing day by day overview across tools */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {daysArray.map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(dateStr);
            const rCount = tools.filter(t => getRentalForDate(t.id, day)).length;
            const percentage = tools.length > 0 ? (rCount / tools.length) * 100 : 0;
            const isToday = new Date().toDateString() === dateObj.toDateString();

            return (
              <div
                key={day}
                className={`p-4 rounded-xl border transition hover:shadow-md bg-white ${
                  isToday ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-slate-100'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    {day} {monthNamesRu[month].slice(0, 3)}
                    {isToday && (
                      <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                        Сегодня
                      </span>
                    )}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    percentage === 100
                      ? 'bg-rose-100 text-rose-700'
                      : percentage > 50
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    Занято: {rCount}/{tools.length}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {tools.map(tool => {
                    const rental = getRentalForDate(tool.id, day);
                    if (rental) {
                      return (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-1.5 rounded-md bg-indigo-50/50 text-xs text-indigo-900 border border-indigo-100/50 font-medium"
                          title={`Клиент: ${rental.clientName}`}
                        >
                          <span className="truncate max-w-[140px] font-semibold">{tool.name}</span>
                          <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-semibold truncate max-w-[64px]">
                            {rental.clientName}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                  {rCount === 0 && (
                    <p className="text-[11px] text-slate-400 italic text-center py-4">
                      Все инструменты свободны
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-4">
        <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Условные обозначения:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-indigo-600" />
          <span>Активная аренда</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-rose-500" />
          <span>Просрочен срок возврата</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-amber-100 border border-amber-200" />
          <span>Ремонт / ТО</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm border border-dashed border-slate-300" />
          <span>Свободен для аренды</span>
        </div>
      </div>
    </div>
  );
}

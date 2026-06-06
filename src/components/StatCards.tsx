import React from 'react';
import { Shield, Clock, AlertCircle, TrendingUp, Hammer } from 'lucide-react';
import { Tool, Rental } from '../types';

interface StatCardsProps {
  tools: Tool[];
  rentals: Rental[];
}

export default function StatCards({ tools, rentals }: StatCardsProps) {
  const totalTools = tools.length;
  const availableTools = tools.filter(t => t.status === 'available').length;
  const maintenanceTools = tools.filter(t => t.status === 'maintenance').length;
  const activeRentals = rentals.filter(r => r.status === 'active').length;
  const overdueRentals = rentals.filter(r => r.status === 'overdue').length;

  // Calculate total earnings of completed + active rentals
  const totalEarnings = rentals.reduce((acc, r) => acc + r.totalPrice, 0);

  // Calculate outstanding debt (from overdue rent: price per day * days late)
  const totalDebt = rentals
    .filter(r => r.status === 'overdue')
    .reduce((acc, r) => {
      const due = new Date(r.endDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - due.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const tool = tools.find(t => t.id === r.toolId);
      const pricePerDay = tool ? tool.pricePerDay : 0;
      return acc + (diffDays * pricePerDay);
    }, 0);

  const stats = [
    {
      id: 'stat-tools',
      title: 'Всего инструментов',
      value: totalTools,
      sub: `${availableTools} свободны • ${maintenanceTools} в ремонте`,
      icon: Hammer,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      id: 'stat-active',
      title: 'Активные аренды',
      value: activeRentals,
      sub: `Инструменты у клиентов на руках`,
      icon: Clock,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      id: 'stat-overdue',
      title: 'Просрочено возвратов',
      value: overdueRentals,
      sub: overdueRentals > 0 ? `Требуется немедленное SMS уведомление!` : `Все инструменты возвращены в срок`,
      icon: AlertCircle,
      color: overdueRentals > 0 ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-100',
    },
    {
      id: 'stat-revenue',
      title: 'Общий оборот',
      value: `${totalEarnings.toLocaleString('ru-RU')} ₽`,
      sub: `Общая сумма всех договоров`,
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div
          key={stat.id}
          id={stat.id}
          className={`p-5 rounded-2xl border bg-white flex items-start justify-between shadow-xs hover:shadow-md transition-all duration-200`}
        >
          <div>
            <p className="text-xs font-medium text-slate-500 tracking-wider uppercase mb-1">{stat.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              {stat.sub}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${stat.color} border`}>
            <stat.icon className="w-5 h-5" />
          </div>
        </div>
      ))}
    </div>
  );
}

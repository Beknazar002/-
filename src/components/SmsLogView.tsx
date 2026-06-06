import React, { useState } from 'react';
import { Mail, Check, AlertCircle, FileText, Smartphone } from 'lucide-react';
import { SMSLog } from '../types';

interface SmsLogViewProps {
  smsLogs: SMSLog[];
}

export default function SmsLogView({ smsLogs }: SmsLogViewProps) {
  const [filter, setFilter] = useState<'All' | 'sent' | 'delivered' | 'failed'>('All');

  const filteredLogs = smsLogs.filter(log => {
    return filter === 'All' ? true : log.status === filter;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            Эмулятор & Журнал SMS Напоминаний
          </h2>
          <p className="text-sm text-slate-500">
            История автоматически и вручную инициированных СМС-оповещений по возврату инструмента
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          {(['All', 'delivered', 'sent', 'failed'] as const).map(f => (
            <button
              key={f}
              id={`sms-log-filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-white text-indigo-700 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f === 'All' ? 'Все' : f === 'delivered' ? 'Доставлено' : f === 'sent' ? 'Отправлено' : 'Сбой'}
            </button>
          ))}
        </div>
      </div>

      {filteredLogs.length > 0 ? (
        <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
          {filteredLogs.map(log => (
            <div
              key={log.id}
              className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/40 relative flex items-start gap-3.5"
            >
              <div className="mt-0.5">
                {log.status === 'delivered' ? (
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Check className="w-4 h-4" />
                  </div>
                ) : log.status === 'sent' ? (
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg animate-pulse">
                    <Mail className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <span className="font-bold text-xs text-slate-800">
                    {log.clientName} ({log.clientPhone})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.sentAt).toLocaleString('ru-RU')}
                  </span>
                </div>

                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100/60 leading-relaxed font-medium">
                  "{log.message}"
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    log.status === 'delivered'
                      ? 'bg-emerald-50 text-emerald-700'
                      : log.status === 'sent'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}>
                    {log.status === 'delivered' ? 'Доставлено в SMS' : log.status === 'sent' ? 'В обработке' : 'Сбой отправления'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">Канал: Симулируемый Шлюз СМС-Центра</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
          <FileText className="w-10 h-10 text-slate-300 mb-2" />
          <h4 className="font-bold text-slate-800 mb-0.5">История СМС пуста</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Отправленные сообщения клиентам о скором завершении аренды будут сохранены в этом лог-файле.
          </p>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Calendar, Plus, Undo2, MessageSquare, AlertCircle, CheckCircle, Search, CalendarCheck2 } from 'lucide-react';
import { Tool, Rental } from '../types';

interface RentalsListProps {
  rentals: Rental[];
  tools: Tool[];
  accessToken: string | null;
  onAddRental: (rental: Omit<Rental, 'id' | 'userId'>) => Promise<void>;
  onReturnRental: (id: string, toolId: string) => Promise<void>;
  onSendSms: (rental: Rental, messageText: string) => Promise<void>;
  onTriggerReAuth: () => Promise<void>;
}

export default function RentalsList({
  rentals,
  tools,
  accessToken,
  onAddRental,
  onReturnRental,
  onSendSms,
  onTriggerReAuth
}: RentalsListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // New rental fields
  const [toolId, setToolId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    return tomorrow.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SMS composer states
  const [composingSmsRental, setComposingSmsRental] = useState<Rental | null>(null);
  const [smsText, setSmsText] = useState('');

  const activeAvailableTools = tools.filter(t => t.status === 'available');

  // Compute live price calculator
  const selectedTool = tools.find(t => t.id === toolId);
  let computedTotalPrice = 0;
  let calculatedDays = 0;
  if (selectedTool && startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = e.getTime() - s.getTime();
    calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (calculatedDays <= 0) calculatedDays = 1; // minimum 1 day
    computedTotalPrice = calculatedDays * selectedTool.pricePerDay;
  }

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolId || !clientName || !clientPhone || !startDate || !endDate) {
      alert('Пожалуйста, заполните все поля формы');
      return;
    }

    const startD = new Date(startDate);
    const endD = new Date(endDate);
    if (endD < startD) {
      alert('Ошибка: Дата возврата не может быть раньше даты выдачи');
      return;
    }

    setIsSubmitting(true);
    try {
      const tool = tools.find(t => t.id === toolId)!;
      await onAddRental({
        toolId,
        toolName: tool.name,
        clientName,
        clientPhone,
        startDate,
        endDate,
        totalPrice: computedTotalPrice,
        status: new Date() > endD ? 'overdue' : 'active',
        returnedAt: null,
      });

      // Reset
      setToolId('');
      setClientName('');
      setClientPhone('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSmsComposer = (rental: Rental) => {
    const daysOverdue = getOverdueDays(rental.endDate);
    const penaltyText = daysOverdue > 0 ? ` Штраф за задержку: ${daysOverdue * 1.5 * 100} ₽.` : '';
    const text = `Уважаемый(ая) ${rental.clientName}! Напоминаем о необходимости возврата инструмента "${rental.toolName}" до ${rental.endDate}.${penaltyText} Пожалуйста, свяжитесь с нами по телефону.`;
    setSmsText(text);
    setComposingSmsRental(rental);
  };

  const handleSendCompiledSms = async () => {
    if (!composingSmsRental || !smsText.trim()) return;
    try {
      await onSendSms(composingSmsRental, smsText);
      alert('Сгенерировано отправленное SMS-сообщение (запись создана в истории логов)');
      setComposingSmsRental(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper inside list UI
  const getOverdueDays = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    if (today > end) {
      const diff = today.getTime() - end.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  const filteredRentals = rentals.filter(rental => {
    const matchesSearch = rental.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rental.toolName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || rental.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Оформление и учет аренды инструментов
            </h2>
            <p className="text-sm text-slate-500">
              Курируйте даты использования, возвраты и автоматические СМС клиентам
            </p>
          </div>

          <button
            id="open-add-rental-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Выдать инструмент в аренду
          </button>
        </div>

        {/* Add Rental Form */}
        {showAddForm && (
          <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Создание арендной ведомости</h3>
            
            {!accessToken && (
              <div className="p-3 bg-indigo-50 border border-indigo-100/50 rounded-lg text-indigo-900 text-xs font-semibold mb-4 flex items-center justify-between">
                <span>⚠️ Google Календарь не подключен. Сделки будут созданы локально без автосинхронизации календаря.</span>
                <button
                  id="rent-connect-calendar-btn"
                  onClick={onTriggerReAuth}
                  className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-md hover:bg-indigo-100"
                >
                  Связать Календарь
                </button>
              </div>
            )}

            <form onSubmit={handleCreateRental} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Выбор свободного инструмента *</label>
                <select
                  id="rent-tool-select"
                  value={toolId}
                  onChange={e => setToolId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  required
                >
                  <option value="">Выберите...</option>
                  {activeAvailableTools.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (S/N: {t.serialNumber}) — {t.pricePerDay} ₽/день
                    </option>
                  ))}
                </select>
                {activeAvailableTools.length === 0 && (
                  <p className="text-[10px] text-amber-500 font-semibold mt-1">
                    Нет доступных свободных инструментов. Измените статус в каталоге или верните сданные.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ФИО Клиента *</label>
                <input
                  type="text"
                  id="rent-client-name"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Иванов Сергей Петрович"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Номер телефона клиента *</label>
                <input
                  type="text"
                  id="rent-client-phone"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="e.g. +7 (999) 123-45-67"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Дата начала *</label>
                  <input
                    type="date"
                    id="rent-start-date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Дата окончания *</label>
                  <input
                    type="date"
                    id="rent-end-date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              {/* Live pricing panel */}
              {selectedTool && (
                <div className="md:col-span-2 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex justify-between items-center">
                  <div className="text-xs">
                    <span className="font-bold text-indigo-900 block">Калькулятор тарифа:</span>
                    <span className="text-indigo-700">
                      {selectedTool.name} × {calculatedDays} дн. ({selectedTool.pricePerDay} ₽ / день)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">ИТОГО К ОПЛАТЕ:</span>
                    <span className="text-lg font-bold text-indigo-700">{computedTotalPrice.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button
                  id="cancel-rent-btn"
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs rounded-xl"
                >
                  Отмена
                </button>
                <button
                  id="save-rent-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Сохранение...' : 'Зарегистрировать и синхронизировать'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="rent-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по клиенту или инструменту..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto self-start sm:self-auto">
            <span className="text-xs text-slate-400 font-bold">Статус:</span>
            <select
              id="rent-status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 hover:bg-white focus:outline-none"
            >
              <option value="All">Все сделки</option>
              <option value="active">Активные</option>
              <option value="returned">Возвращенные</option>
              <option value="overdue">Просроченные ⚠️</option>
            </select>
          </div>
        </div>

        {/* Table of Rentals */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase">Инструмент</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase">Клиент / Ссылка</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase">Даты (С — По)</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase">Оплата</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase">Календарь</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase">Статус</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRentals.map(rental => {
                const daysLate = getOverdueDays(rental.endDate);
                return (
                  <tr key={rental.id} className="hover:bg-slate-50/40 text-xs">
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{rental.toolName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {rental.id.slice(0, 8)}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{rental.clientName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{rental.clientPhone}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-600">
                      <div>С: {rental.startDate}</div>
                      <div>По: {rental.endDate}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{rental.totalPrice.toLocaleString('ru-RU')} ₽</div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rental.calendarEventId 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <CalendarCheck2 className="w-3 h-3 text-indigo-500" />
                        {rental.calendarEventId ? 'Google Sync' : 'Нет синхр.'}
                      </span>
                    </td>
                    <td className="p-3">
                      {rental.status === 'active' && (
                        <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          Активна
                        </span>
                      )}
                      {rental.status === 'returned' && (
                        <div>
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Возвращен
                          </span>
                          {rental.returnedAt && (
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              {new Date(rental.returnedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                      {rental.status === 'overdue' && (
                        <div>
                          <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md animate-pulse">
                            Просрочен ({daysLate} дн.) ⚠️
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Notify button */}
                        {rental.status !== 'returned' && (
                          <button
                            id={`sms-btn-${rental.id}`}
                            onClick={() => handleOpenSmsComposer(rental)}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 transition-all rounded-lg flex items-center gap-1"
                            title="Отправить SMS"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="font-bold text-[10px]">Напомнить СМС</span>
                          </button>
                        )}

                        {/* Return action button */}
                        {rental.status !== 'returned' && (
                          <button
                            id={`return-btn-${rental.id}`}
                            onClick={() => {
                              if (window.confirm(`Подтверждаете возврат инструмента "${rental.toolName}" от клиента ${rental.clientName}?`)) {
                                onReturnRental(rental.id, rental.toolId);
                              }
                            }}
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 transition-all rounded-lg flex items-center gap-1"
                            title="Возврат"
                          >
                            <Undo2 className="w-4 h-4" />
                            <span className="font-bold text-[10px]">Возврат</span>
                          </button>
                        )}
                        {rental.status === 'returned' && (
                          <span className="text-slate-400 italic text-[11px]">Сделка закрыта</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRentals.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    Записи по прокату не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SMS Composer Popover Model */}
      {composingSmsRental && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 shadow-xl relative animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Отправка напоминания клиенту
            </h3>

            <div className="mb-4">
              <div className="text-xs text-slate-500 mb-1">Получатель (Номер):</div>
              <div className="text-xs font-bold text-slate-800">{composingSmsRental.clientName} ({composingSmsRental.clientPhone})</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Содержимое СМС-сообщения</label>
              <textarea
                id="sms-composer-textarea"
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 border border-slate-250 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Simulated Phone UI Preview */}
            <div className="p-3 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-[10px] text-slate-400 mb-5 relative">
              <span className="font-bold text-slate-500 block mb-1">Предпросмотр на мобильном устройстве:</span>
              <div className="bg-white border text-slate-700 p-2.5 rounded-lg shadow-3xs text-[11px] leading-relaxed relative">
                {smsText || <span className="text-slate-400">Введите сообщение...</span>}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                id="close-sms-composer-btn"
                type="button"
                onClick={() => setComposingSmsRental(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs rounded-xl"
              >
                Отмена
              </button>
              <button
                id="confirm-send-sms-btn"
                type="button"
                onClick={handleSendCompiledSms}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl"
              >
                Отправить по SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

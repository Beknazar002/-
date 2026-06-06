import React, { useState } from 'react';
import { Plus, Trash2, PenTool, CheckCircle2, AlertTriangle, Hammer, Search, Filter } from 'lucide-react';
import { Tool } from '../types';

interface ToolsCatalogProps {
  tools: Tool[];
  onAddTool: (tool: Omit<Tool, 'id'>) => Promise<void>;
  onDeleteTool: (id: string) => Promise<void>;
  onUpdateToolStatus: (id: string, status: Tool['status']) => Promise<void>;
}

export default function ToolsCatalog({
  tools,
  onAddTool,
  onDeleteTool,
  onUpdateToolStatus,
}: ToolsCatalogProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Электроинструменты');
  const [serialNumber, setSerialNumber] = useState('');
  const [pricePerDay, setPricePerDay] = useState<number | ''>('');
  const [status, setStatus] = useState<Tool['status']>('available');

  const categories = ['Электроинструменты', 'Ручные инструменты', 'Садовая техника', 'Строительное оборудование'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !serialNumber || !pricePerDay) {
      alert('Пожалуйста, заполните основные поля: Название, Серийный номер и Стоимость');
      return;
    }

    await onAddTool({
      name,
      description,
      category,
      serialNumber,
      pricePerDay: Number(pricePerDay),
      status,
    });

    // Reset Form
    setName('');
    setDescription('');
    setCategory('Электроинструменты');
    setSerialNumber('');
    setPricePerDay('');
    setStatus('available');
    setShowAddForm(false);
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tool.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Hammer className="w-5 h-5 text-indigo-500" />
              Каталог инструментов
            </h2>
            <p className="text-sm text-slate-500">
              Добавляйте, удаляйте и контролируйте статус оборудования на складе
            </p>
          </div>

          <button
            id="open-add-tool-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Добавить инструмент
          </button>
        </div>

        {/* Add Tool Form */}
        {showAddForm && (
          <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-xl relative">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Форма добавления нового инструмента</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Название инструмента *</label>
                <input
                  type="text"
                  id="tool-name-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Перфоратор Bosch GBH 2-28"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Серийный номер (S/N) *</label>
                <input
                  type="text"
                  id="tool-sn-input"
                  value={serialNumber}
                  onChange={e => setSerialNumber(e.target.value)}
                  placeholder="e.g. BS-9402-A"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Категория</label>
                <select
                  id="tool-cat-select"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Стоимость аренды (₽ в день) *</label>
                <input
                  type="number"
                  id="tool-price-input"
                  value={pricePerDay}
                  onChange={e => setPricePerDay(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="имя тарифа, e.g. 800"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  required
                  min="0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Описание инструмента</label>
                <textarea
                  id="tool-desc-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Техническое состояние, особенности применения, комплектация..."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Текущий статус</label>
                <select
                  id="tool-status-select"
                  value={status}
                  onChange={e => setStatus(e.target.value as Tool['status'])}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="available">Доступен (Свободен)</option>
                  <option value="maintenance">На обслуживании / В ремонте</option>
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button
                  id="cancel-tool-add-btn"
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs rounded-xl"
                >
                  Отмена
                </button>
                <button
                  id="save-tool-add-btn"
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Searching and Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center mb-6">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="tool-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или серийному номеру..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="tool-category-filter"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 hover:bg-white focus:outline-none"
            >
              <option value="All">Все категории</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tool Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map(tool => (
            <div
              key={tool.id}
              className="p-5 border border-slate-100 rounded-2xl bg-white shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {tool.category}
                  </span>
                  
                  {/* Status pills click list */}
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${
                      tool.status === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : tool.status === 'rented'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {tool.status === 'available' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      {tool.status === 'rented' && <PenTool className="w-3 h-3 text-blue-500" />}
                      {tool.status === 'maintenance' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      {tool.status === 'available' ? 'Свободен' : tool.status === 'rented' ? 'Сдан' : 'Ремонт'}
                    </span>
                  </div>
                </div>

                <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{tool.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 h-8 mb-3">{tool.description || 'Описание не заполнено.'}</p>

                <div className="space-y-1.5 border-t border-slate-50 pt-3 mb-4">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>S/N серийный номер</span>
                    <span className="font-mono font-semibold text-slate-800">{tool.serialNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Аренда в день</span>
                    <span className="font-bold text-indigo-600">{tool.pricePerDay} ₽</span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-3">
                <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
                  <button
                    id={`set-avail-${tool.id}`}
                    onClick={() => onUpdateToolStatus(tool.id, 'available')}
                    className={`text-[9px] font-extrabold px-1.5 py-1 rounded-md transition ${
                      tool.status === 'available'
                        ? 'bg-emerald-100 text-emerald-700 shadow-3xs'
                        : 'text-slate-400 hover:bg-white hover:text-slate-600'
                    }`}
                    title="Свободен"
                    disabled={tool.status === 'rented'}
                  >
                    Свободен
                  </button>
                  <button
                    id={`set-maint-${tool.id}`}
                    onClick={() => onUpdateToolStatus(tool.id, 'maintenance')}
                    className={`text-[9px] font-extrabold px-1.5 py-1 rounded-md transition ${
                      tool.status === 'maintenance'
                        ? 'bg-amber-100 text-amber-700 shadow-3xs'
                        : 'text-slate-400 hover:bg-white hover:text-slate-600'
                    }`}
                    title="В ремонт"
                    disabled={tool.status === 'rented'}
                  >
                    Ремонт
                  </button>
                </div>

                <button
                  id={`del-tool-btn-${tool.id}`}
                  onClick={() => {
                    if (tool.status === 'rented') {
                      alert('Нельзя удалить инструмент, находящийся в аренде!');
                      return;
                    }
                    if (window.confirm(`Вы уверены, что хотите удалить ${tool.name}?`)) {
                      onDeleteTool(tool.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredTools.length === 0 && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-10 text-center">
              <p className="text-sm text-slate-400 italic">Инструменты не найдены</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

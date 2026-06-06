import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Hammer,
  Clock,
  AlertCircle,
  Smartphone,
  BarChart3,
  CalendarDays,
  CloudLightning,
  Wifi,
  WifiOff,
  LogOut,
  CalendarCheck2,
  Lock,
  Loader2,
  RefreshCw,
  Zap,
  CheckCircle2
} from 'lucide-react';

import { auth, db, googleSignIn, getAccessToken, logout, initAuth, setAccessToken } from './firebase';
import { createCalendarEvent, deleteCalendarEvent } from './calendar-api';
import { Tool, Rental, SMSLog } from './types';
import { INITIAL_CATALOG_TOOLS } from './initialTools';

// Views
import StatCards from './components/StatCards';
import ToolsCatalog from './components/ToolsCatalog';
import RentalsList from './components/RentalsList';
import SchedulerCalendar from './components/SchedulerCalendar';
import DebtReport from './components/DebtReport';
import SmsLogView from './components/SmsLogView';
import AnalyticsPanel from './components/AnalyticsPanel';

// Error Handler following Firebase Skill Guidelines
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // DB collections state
  const [tools, setTools] = useState<Tool[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);

  // Navigation
  const [activeTab, setActiveTab] = useState<'status' | 'inventory' | 'rentals' | 'calendar' | 'debtors' | 'sms' | 'charts'>('status');

  // Syncing indicators
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor network connection (Offline mode tracking)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up Firebase Auth state listener and fetch the in-memory access token
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, cachedToken) => {
        setUser(currentUser);
        setToken(cachedToken);
        setIsLoadingAuth(false);
      },
      () => {
        setUser(auth.currentUser);
        setIsLoadingAuth(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Once user logged in, listen to Firestore data
  useEffect(() => {
    if (!user) return;

    setIsSyncing(true);

    const matchToolsPath = 'tools';
    const unsubscribeTools = onSnapshot(
      collection(db, matchToolsPath),
      async (snapshot) => {
        const toolsData: Tool[] = [];
        snapshot.forEach((docSnap) => {
          toolsData.push({ id: docSnap.id, ...docSnap.data() } as Tool);
        });

        // Seed if empty tools collection in Firestore
        if (toolsData.length === 0 && isOnline) {
          try {
            console.log('Seeding initial tools collection to database');
            const batch = writeBatch(db);
            INITIAL_CATALOG_TOOLS.forEach((t) => {
              const newDocRef = doc(collection(db, 'tools'));
              batch.set(newDocRef, { ...t, id: newDocRef.id, createdAt: new Date().toISOString() });
            });
            await batch.commit();
          } catch (e) {
            console.error('Failed to seed tools database', e);
          }
        } else {
          setTools(toolsData);
        }
        setIsSyncing(false);
      },
      (error) => {
        setIsSyncing(false);
        handleFirestoreError(error, OperationType.GET, matchToolsPath);
      }
    );

    const matchRentalsPath = 'rentals';
    const unsubscribeRentals = onSnapshot(
      collection(db, matchRentalsPath),
      (snapshot) => {
        const rentalsData: Rental[] = [];
        snapshot.forEach((docSnap) => {
          const dat = docSnap.data();
          // Filter in rule constraints safely
          if (dat.userId === user.uid) {
            rentalsData.push({ id: docSnap.id, ...dat } as Rental);
          }
        });

        // Automatically assess status of rentals: if expired, mark overdue
        const now = new Date();
        now.setHours(0,0,0,0);
        const mappedRentals = rentalsData.map(r => {
          const end = new Date(r.endDate);
          end.setHours(0,0,0,0);
          if (r.status === 'active' && now > end) {
            return { ...r, status: 'overdue' as const };
          }
          return r;
        });

        // Fast state sorting: newer first
        setRentals(mappedRentals.sort((a,b) => b.startDate.localeCompare(a.startDate)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, matchRentalsPath);
      }
    );

    const matchSmsPath = 'smsLogs';
    const unsubscribeSms = onSnapshot(
      collection(db, matchSmsPath),
      (snapshot) => {
        const smsData: SMSLog[] = [];
        snapshot.forEach((docSnap) => {
          smsData.push({ id: docSnap.id, ...docSnap.data() } as SMSLog);
        });
        setSmsLogs(smsData.sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, matchSmsPath);
      }
    );

    return () => {
      unsubscribeTools();
      unsubscribeRentals();
      unsubscribeSms();
    };
  }, [user, isOnline]);

  // Auth & Sign-in handler
  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err) {
      console.error('Sign in process failed', err);
    }
  };

  const handleLogoutAction = async () => {
    if (window.confirm('Вы действительно хотите выйти из учетной записи?')) {
      await logout();
      setUser(null);
      setToken(null);
    }
  };

  const handleExplicitReAuth = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setToken(res.accessToken);
        alert('Google Календарь успешно авторизован и подключен!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Tool
  const handleAddTool = async (newTool: Omit<Tool, 'id'>) => {
    const path = 'tools';
    try {
      const newDocRef = doc(collection(db, path));
      await setDoc(newDocRef, {
        ...newTool,
        id: newDocRef.id,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Delete Tool
  const handleDeleteTool = async (toolId: string) => {
    const path = `tools/${toolId}`;
    try {
      await deleteDoc(doc(db, 'tools', toolId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Update Status of Tool
  const handleUpdateToolStatus = async (toolId: string, status: Tool['status']) => {
    const path = `tools/${toolId}`;
    try {
      await updateDoc(doc(db, 'tools', toolId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Create Rental & sync to Google Calendar
  const handleAddRental = async (newRental: Omit<Rental, 'id' | 'userId'>) => {
    if (!user) return;
    const path = 'rentals';
    
    try {
      let calendarEventId: string | null = null;

      // Real integration: Synchronize dates with Google Calendar using the OAuth access token
      if (token) {
        try {
          console.log('Synchronizing rental lease to Google Calendar...');
          const eventId = await createCalendarEvent(token, {
            toolName: newRental.toolName,
            clientName: newRental.clientName,
            clientPhone: newRental.clientPhone,
            startDate: newRental.startDate,
            endDate: newRental.endDate,
          });
          if (eventId) {
            calendarEventId = eventId;
            console.log('Successfully synced. Calendar Event ID:', eventId);
          }
        } catch (calErr) {
          console.warn('Could not sync event to Google Calendar. Continuing with local write.', calErr);
        }
      }

      const newDocRef = doc(collection(db, path));
      const rentalPayload: Rental = {
        ...newRental,
        id: newDocRef.id,
        userId: user.uid,
        calendarEventId,
        createdAt: new Date().toISOString(),
      };

      // Atomic creation
      await setDoc(newDocRef, rentalPayload);

      // Lock tool status to rented
      await handleUpdateToolStatus(newRental.toolId, 'rented');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Return Tool Rental
  const handleReturnRental = async (rentalId: string, toolId: string) => {
    const path = `rentals/${rentalId}`;
    try {
      const rental = rentals.find(r => r.id === rentalId);
      
      // If synced to Google calendar, we can remove the scheduled calendar event nicely
      if (token && rental?.calendarEventId) {
        try {
          await deleteCalendarEvent(token, rental.calendarEventId);
        } catch (calErr) {
          console.warn('Calendar clean-up failed, continuing database write.', calErr);
        }
      }

      await updateDoc(doc(db, 'rentals', rentalId), {
        status: 'returned',
        returnedAt: new Date().toISOString(),
      });

      // Free the tool back to available
      await handleUpdateToolStatus(toolId, 'available');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Send return SMS (Simulated)
  const handleSendSimulatedSms = async (rental: Rental, messageText: string) => {
    const path = 'smsLogs';
    try {
      const newDocRef = doc(collection(db, path));
      const smsPayload: SMSLog = {
        id: newDocRef.id,
        rentalId: rental.id,
        clientName: rental.clientName,
        clientPhone: rental.clientPhone,
        message: messageText,
        sentAt: new Date().toISOString(),
        status: isOnline ? 'delivered' : 'sent', // standard delivery emulation
      };
      await setDoc(newDocRef, smsPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-550 flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Инициализация проката...</span>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 font-sans selection:bg-indigo-500 selection:text-white">
        <div className="bg-white rounded-3xl border border-slate-200/50 shadow-xl max-w-md w-full p-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-300">
          
          {/* Logo */}
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-5 border border-indigo-100/50">
            <Hammer className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-bold text-slate-950 tracking-tight">Учет аренды инструментов</h1>
          <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
            Проприетарная система управления инструментальным парком, отслеживания сроков возврата сделок, облачной синхронизации в реальном времени и интеграции с Google Календарем.
          </p>

          <div className="w-full space-y-3.5 my-7 border-t border-slate-100 pt-7">
            <div className="flex items-center gap-3 text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition duration-150">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Google Календарь</span>
                <span className="text-slate-400">Автосинхронизация дат выданных инструментов</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition duration-150">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">SMS-Центр</span>
                <span className="text-slate-400">Мгновенный биллинг просрочек по задолженностям</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition duration-150">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Wifi className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Оффлайн-режим (Offline)</span>
                <span className="text-slate-400">Встроенная кэш-база при плохом покрытии связи</span>
              </div>
            </div>
          </div>

          {/* Premium Google Sign-In Button */}
          <button
            id="gsi-login-btn"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3.5 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl font-bold text-xs transition-all duration-150 shadow-md shadow-indigo-150 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Авторизоваться через Google</span>
          </button>

          <span className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest block">
            Защищено шифрованием • Spark Firestore
          </span>
        </div>
      </div>
    );
  }

  // FULL WORKSPACE APP LAYOUT BASED ON SYSTEM DESIGN PRINCIPLES
  const menuItems = [
    { id: 'status', label: 'Сводка', icon: Loader2 },
    { id: 'inventory', label: 'Инвентарь', icon: Hammer },
    { id: 'rentals', label: 'Сделки проката', icon: Clock },
    { id: 'calendar', label: 'Календарь', icon: CalendarDays },
    { id: 'debtors', label: 'Должники ⚠️', icon: AlertCircle },
    { id: 'sms', label: 'СМС Шлюз', icon: Smartphone },
    { id: 'charts', label: 'Аналитика', icon: BarChart3 },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      
      {/* Top Universal Navbar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs">
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold text-indigo-600 block tracking-widest">Управление Парком</span>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none mt-0.5">ИнструментАренда Экспресс</h1>
          </div>
        </div>

        {/* Sync, Connection & Calendar Status Bars */}
        <div className="flex items-center gap-3">
          
          {/* Calendar Status Indicator */}
          <button
            onClick={handleExplicitReAuth}
            className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border transition-all ${
              token
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {token ? 'Google Календарь: Ок' : 'Подключить Google Календарь'}
            </span>
          </button>

          {/* Network Indicators */}
          <div className={`flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl border ${
            isOnline 
              ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
              : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-indigo-500" /> : <WifiOff className="w-3.5 h-3.5 text-amber-500" />}
            <span>{isOnline ? 'ОБЛАКО: СИНХР' : 'АВТОНОМНЫЙ РЕЖИМ (ОФФЛАЙН)'}</span>
          </div>

          {/* User Signout */}
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-4">
            <div className="hidden md:block text-right">
              <span className="text-[11px] font-bold text-slate-800 block max-w-[140px] truncate">{user.displayName || user.email}</span>
              <span className="text-[9px] text-slate-400 block max-w-[140px] truncate">{user.email}</span>
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-7 h-7 rounded-lg border border-slate-200" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-bold text-xs flex items-center justify-center uppercase">
                {user.email?.slice(0, 2)}
              </div>
            )}
            <button
              id="user-logout-btn"
              onClick={handleLogoutAction}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              title="Выйти из системы"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Grid */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-150 p-4 flex flex-col justify-between">
          <div className="space-y-1">
            {menuItems.map(item => {
              const IconComp = item.icon === Loader2 ? CheckCircle2 : item.icon;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    activeTab === item.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block p-4 border border-slate-100 bg-slate-50/50 rounded-xl mt-6">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Аренда инфо:</span>
            <div className="text-[11px] text-slate-500 mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Инструментов:</span>
                <span className="font-bold text-slate-800">{tools.length} шт.</span>
              </div>
              <div className="flex justify-between">
                <span>В аренде:</span>
                <span className="font-bold text-indigo-600">{tools.filter(t => t.status === 'rented').length} шт.</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/50 pt-1 mt-1">
                <span>Просроченные возвраты:</span>
                <span className="font-bold text-rose-600">{rentals.filter(r => r.status === 'overdue').length} ед.</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Primary Workspace Scroll Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-indigo-950 tracking-tight">Сводная Панель Мониторинга</h2>
                  <p className="text-xs text-slate-500">Общие показатели инструментального проката и состояние сети в реальном времени</p>
                </div>
                {isSyncing && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Синхронизация с базой...</span>
                  </div>
                )}
              </div>
              <StatCards tools={tools} rentals={rentals} />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Real-time Alerts */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    Последняя активность проката
                  </h3>
                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-2">
                    {rentals.slice(0, 5).map(rental => (
                      <div key={rental.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{rental.toolName}</div>
                          <div className="text-slate-400 font-medium">{rental.clientName} ({rental.clientPhone})</div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block font-extrabold px-2 py-0.5 rounded ${
                            rental.status === 'active' 
                              ? 'bg-blue-50 text-blue-700' 
                              : rental.status === 'returned' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-rose-50 text-rose-700 animate-pulse'
                          }`}>
                            {rental.status === 'active' ? 'Выдан' : rental.status === 'returned' ? 'Вернули' : 'Просрочено!'}
                          </span>
                          <div className="text-slate-400 font-mono text-[9px] mt-0.5">срок: {rental.endDate}</div>
                        </div>
                      </div>
                    ))}
                    {rentals.length === 0 && (
                      <div className="py-8 text-center text-slate-400 italic">Активных сделок пока не зарегистрировано</div>
                    )}
                  </div>
                </div>

                {/* Cloud & Offline instruction */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                      <CloudLightning className="w-4 h-4 text-amber-500" />
                      Оффлайн-работа
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      Приложение полностью спроектировано под мобильные устройства в местах с нестабильной связью (подвалы, стройки).
                    </p>
                    <div className="space-y-2 mt-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-650">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Кэш сохраняется локально</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-650">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>Авто-синхронизация при онлайн</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-150 text-[10px] text-slate-400 leading-normal">
                    Все внесенные операции будут сохранены локально в браузере в защищенный IndexedDB контейнер и отправлены в облако Firestore автоматически при восстановлении интернета.
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <ToolsCatalog
              tools={tools}
              onAddTool={handleAddTool}
              onDeleteTool={handleDeleteTool}
              onUpdateToolStatus={handleUpdateToolStatus}
            />
          )}

          {activeTab === 'rentals' && (
            <RentalsList
              rentals={rentals}
              tools={tools}
              accessToken={token}
              onAddRental={handleAddRental}
              onReturnRental={handleReturnRental}
              onSendSms={handleSendSimulatedSms}
              onTriggerReAuth={handleExplicitReAuth}
            />
          )}

          {activeTab === 'calendar' && (
            <SchedulerCalendar tools={tools} rentals={rentals} />
          )}

          {activeTab === 'debtors' && (
            <DebtReport
              rentals={rentals}
              tools={tools}
              onTriggerNotification={(r) => console.log('notifying', r)}
            />
          )}

          {activeTab === 'sms' && (
            <SmsLogView smsLogs={smsLogs} />
          )}

          {activeTab === 'charts' && (
            <AnalyticsPanel rentals={rentals} tools={tools} />
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * agroWish Frontend - Main Application Shell & Full SRS Integrated Dashboard
 * SE-331 Software Engineering Design Capstone Project
 * - Member 1: Md Adnan Ul Islam (ID: 241-35-103) - AI & Recommendation Lead
 * - Member 2: Most Tasnim Jahan Rifa (ID: 241-35-116) - Backend & Data Lead
 * - Member 3: Tasdid Al Amin (ID: 241-35-108) - Frontend & Usability Lead
 */

import React, { useState, useEffect } from 'react';
import {
  Sprout,
  LogOut,
  LogIn,
  Phone,
  Mail,
  ShieldCheck,
  Tractor,
  Layers,
  TrendingUp,
  Database,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  History,
  MessageSquare
} from 'lucide-react';
import AuthModal from './components/AuthModal';
import FarmProfileForm from './components/FarmProfileForm';
import ResourceManager from './components/ResourceManager';
import RecommendationList from './components/RecommendationList';
import RecommendationHistory from './components/RecommendationHistory';
import BanglaChatAssistant from './components/BanglaChatAssistant';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [profileSummary, setProfileSummary] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // Active Navigation View: 'profileForm' | 'resources' | 'recommendations' | 'history' | 'chat' | 'admin'
  const [activeTab, setActiveTab] = useState('profileForm');

  const hydrateProfileSummary = (profileData) => {
    if (!profileData) return;
    setProfileSummary(profileData);
    const complete = Boolean(
      profileData.district &&
      profileData.upazila &&
      profileData.land_size &&
      parseFloat(profileData.land_size) > 0 &&
      profileData.soil_type &&
      profileData.season
    );
    setIsProfileComplete(complete);
  };

  // Restore stored session and verify token on startup (FR-31)
  useEffect(() => {
    const savedToken = localStorage.getItem('agrowish_token');
    const savedUser = localStorage.getItem('agrowish_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);

        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        })
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error('Session invalid');
          })
          .then((data) => {
            if (data.success && data.user) {
              setUser(data.user);
              localStorage.setItem('agrowish_user', JSON.stringify(data.user));
              if (data.user.profile) {
                hydrateProfileSummary(data.user.profile);
              }
            }
          })
          .catch(() => {
            handleLogout();
          });
      } catch {
        handleLogout();
      }
    }
  }, []);

  // Update document title dynamically per SPA page (Accessibility 2.4.2)
  useEffect(() => {
    const titles = {
      profileForm: 'খামারের তথ্য | agroWish',
      resources: 'সম্পদ ও লক্ষ্য | agroWish',
      recommendations: 'ফসল ও সমন্বিত সুপারিশ | agroWish',
      history: 'পূর্ববর্তী সুপারিশ | agroWish',
      chat: 'বাংলা কৃষি সহায়ক | agroWish',
      admin: 'অ্যাডমিন প্যানেল | agroWish'
    };
    document.title = user ? (titles[activeTab] || 'agroWish - স্মার্ট কৃষি সহায়ক') : 'agroWish - স্মার্ট কৃষি সহায়ক ও ফসল পরিকল্পনা';
  }, [activeTab, user]);

  const handleAuthSuccess = (authenticatedUser, authToken) => {
    setUser(authenticatedUser);
    setToken(authToken);
    setIsAuthModalOpen(false);
    if (authenticatedUser?.role === 'ADMIN') {
      setActiveTab('admin');
    } else {
      setActiveTab('profileForm');
    }
    // Load profile status right after login
    if (authToken) {
      fetch('/api/profile/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.profile) {
            hydrateProfileSummary(d.profile);
          }
        })
        .catch(() => {});
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {
        // Silently continue
      }
    }
    localStorage.removeItem('agrowish_token');
    localStorage.removeItem('agrowish_user');
    setUser(null);
    setToken(null);
    setProfileSummary(null);
    setIsProfileComplete(false);
    setActiveTab('profileForm');
    setIsAuthModalOpen(false);
  };

  const handleProfileSaved = (updatedProfile, complete) => {
    setProfileSummary(updatedProfile);
    setIsProfileComplete(complete);
    if (complete) {
      setActiveTab('recommendations');
    }
  };

  const displayName = user ? (user.full_name || user.name || 'সম্মানিত কৃষক') : '';

  const navItems = [
    { id: 'profileForm', label: 'খামারের তথ্য', icon: Layers },
    { id: 'resources', label: 'সম্পদ ও লক্ষ্য', icon: Boxes },
    { id: 'recommendations', label: 'সুপারিশ ও তুলনা', icon: TrendingUp },
    { id: 'history', label: 'পূর্ববর্তী সুপারিশ', icon: History },
    { id: 'chat', label: 'বাংলা কৃষি চ্যাট', icon: MessageSquare },
    ...(user?.role === 'ADMIN' ? [{ id: 'admin', label: 'অ্যাডমিন প্যানেল', icon: ShieldCheck }] : [])
  ];

  const handleNavClick = (e, id) => {
    setActiveTab(id);
    e.currentTarget?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <a href="#main-content" className="skip-link visually-hidden bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold">
        মূল বিষয়বস্তুতে যান
      </a>

      {/* -------------------- Top Header -------------------- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Left: Branding */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl shadow-md shadow-emerald-500/20">
                <Sprout className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                    agroWish
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  স্মার্ট কৃষি সহায়ক ও সমন্বিত খামার পরিকল্পনা প্ল্যাটফর্ম
                </p>
              </div>
            </div>

            {/* Right: User & Logout */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2.5 bg-slate-100/90 py-1.5 px-3 rounded-2xl border border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {displayName.charAt(0)}
                    </div>
                    <div className="text-left hidden md:block">
                      <div className="text-xs font-bold text-slate-800 leading-tight">{displayName}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        {user.role === 'ADMIN' ? (
                          <><ShieldCheck className="w-3 h-3" aria-hidden="true" /> অ্যাডমিন</>
                        ) : (
                          <><Tractor className="w-3 h-3" aria-hidden="true" /> কৃষক সদস্য</>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="লগআউট করুন"
                    className="flex items-center gap-1.5 px-3.5 py-2 min-h-11 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">লগআউট</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 min-h-11 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>লগইন / নিবন্ধন</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* -------------------- Main Workspace -------------------- */}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          <div className="space-y-6">
            {/* Welcome Greeting Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-emerald-200 border border-white/15 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                  সক্রিয় সেশন: {user.role === 'ADMIN' ? 'সিস্টেম অ্যাডমিনিস্ট্রেটর' : 'নিবন্ধিত কৃষক সদস্য'}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  স্বাগতম, {displayName}! 🌱
                </h1>
                <p className="mt-2 text-emerald-100 text-xs sm:text-sm leading-relaxed">
                  খামারের মাটি, বাজেট, বিদ্যমান সম্পদ এবং সরকারি গবেষণা তথ্যভাণ্ডারের সমন্বয়ে সেরা ফসল, সমন্বিত চাষ ও নিরাপদ বর্জ্য-থেকে-সম্পদ পরামর্শ পান।
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                    <Mail className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                    <span>{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                      <Phone className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                    <Database className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                    <span>আইডি #{user.id || user.user_id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Status Summary Card */}
            {user.role !== 'ADMIN' && (
              <div className={`p-5 rounded-3xl border transition-all ${
                isProfileComplete ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`p-3 rounded-2xl flex-shrink-0 ${
                      isProfileComplete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {isProfileComplete ? <CheckCircle2 className="w-6 h-6" aria-hidden="true" /> : <AlertTriangle className="w-6 h-6" aria-hidden="true" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-slate-900 text-base">
                          খামার প্রোফাইল স্ট্যাটাস: {isProfileComplete ? 'সম্পূর্ণ (Complete)' : 'অপূর্ণ (Pending)'}
                        </h2>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isProfileComplete ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                        }`}>
                          {isProfileComplete ? 'সক্রিয় ও প্রস্তুত' : 'তথ্য পূরণ আবশ্যক'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {isProfileComplete
                          ? `জেলা: ${profileSummary?.district || ''}, জমি: ${profileSummary?.land_size || 0} শতক, মাটি: ${profileSummary?.soil_type || ''}, মৌসুম: ${profileSummary?.season || ''}।`
                          : 'ফসল ও সমন্বিত খামার সুপারিশ পেতে প্রথমে আপনার জমির পরিমাণ, মাটি ও মৌসুমি তথ্য পূরণ করে সংরক্ষণ করুন।'}
                      </p>
                    </div>
                  </div>

                  {isProfileComplete && activeTab !== 'recommendations' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('recommendations')}
                      className="flex items-center gap-2 px-4 py-2.5 min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer self-start sm:self-auto"
                    >
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      <span>সুপারিশসমূহ দেখুন</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Primary Navigation (Single Scrollable Row, Explicit Bottom Indicator, aria-current="page") */}
            <nav aria-label="প্রধান মেনু" className="bg-white rounded-2xl border border-slate-200 shadow-2xs px-2">
              <div className="nav-scroll gap-1">
                {navItems.map((item) => {
                  const IconComp = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={(e) => handleNavClick(e, item.id)}
                      className={`flex-none inline-flex items-center gap-2 px-4 py-3.5 min-h-12 text-xs sm:text-sm font-bold whitespace-nowrap border-b-3 transition-colors cursor-pointer snap-start ${
                        isActive
                          ? 'text-emerald-800 border-emerald-600 bg-emerald-50/50'
                          : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* View Content */}
            {activeTab === 'profileForm' && (
              <FarmProfileForm onProfileSaved={handleProfileSaved} />
            )}

            {activeTab === 'resources' && (
              <ResourceManager onGenerateIntegrated={() => setActiveTab('recommendations')} />
            )}

            {activeTab === 'recommendations' && (
              <RecommendationList
                onNavigateToProfile={() => setActiveTab('profileForm')}
                onNavigateToResources={() => setActiveTab('resources')}
              />
            )}

            {activeTab === 'history' && (
              <RecommendationHistory onGenerateNew={() => setActiveTab('recommendations')} />
            )}

            {activeTab === 'chat' && (
              <BanglaChatAssistant />
            )}

            {activeTab === 'admin' && user.role === 'ADMIN' && (
              <AdminDashboard />
            )}
          </div>
        ) : (
          /* ================= Unauthenticated Hero ================= */
          <div className="py-12 max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>স্মার্ট কৃষি সিদ্ধান্ত সহায়ক প্ল্যাটফর্ম</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              স্মার্ট কৃষি ও ফসল নির্বাচনের <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                আধুনিক ডিজিটাল সহায়ক
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              agroWish বাংলাদেশের প্রান্তিক কৃষকদের জন্য মাটির ধরন, বাজেট, বিদ্যমান খামার সম্পদ ও সরকারি কৃষি তথ্যভাণ্ডার বিশ্লেষণ করে সর্বোত্তম ফসল, সমন্বিত চাষ ও নিরাপদ বর্জ্য-থেকে-সম্পদ পরামর্শ প্রদান করে।
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-8 py-3.5 min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
              >
                <span>নিবন্ধন অথবা লগইন করুন</span>
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* -------------------- Footer -------------------- */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span className="font-semibold text-slate-700">agroWish</span>
            <span>&copy; {new Date().getFullYear()} - স্মার্ট কৃষি সহায়ক প্ল্যাটফর্ম</span>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

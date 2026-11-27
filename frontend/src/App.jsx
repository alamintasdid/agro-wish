/**
 * agroWish Frontend - Main Application Shell & Complete Agricultural Decision Platform
 * Bilingual (Bengali default & English), Mobile-Responsive, Farmer-Accessible UI.
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
  MessageSquare,
  Globe,
  Compass,
  PieChart,
  Calendar,
  Menu,
  X
} from 'lucide-react';
import { useLanguage } from './i18n/LanguageContext';
import AuthModal from './components/AuthModal';
import FarmProfileForm from './components/FarmProfileForm';
import LandManager from './components/LandManager';
import ResourceManager from './components/ResourceManager';
import MixedCroppingView from './components/MixedCroppingView';
import RecommendationList from './components/RecommendationList';
import ProfitAnalysisDashboard from './components/ProfitAnalysisDashboard';
import FarmingRoadmapView from './components/FarmingRoadmapView';
import RecommendationHistory from './components/RecommendationHistory';
import BanglaChatAssistant from './components/BanglaChatAssistant';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const { lang, toggleLanguage, t } = useLanguage();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initialAdminMode, setInitialAdminMode] = useState(false);
  const [profileSummary, setProfileSummary] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active Navigation Tab:
  // 'profileForm' | 'lands' | 'resources' | 'mixed' | 'recommendations' | 'profit' | 'roadmap' | 'history' | 'chat' | 'admin'
  const [activeTab, setActiveTab] = useState('profileForm');

  // Shared state for jumping from Mixed view into Profit or Roadmap
  const [selectedComboForView, setSelectedComboForView] = useState(null);

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

  const handleAuthSuccess = (authenticatedUser, authToken) => {
    setUser(authenticatedUser);
    setToken(authToken);
    setIsAuthModalOpen(false);
    if (authenticatedUser?.role === 'ADMIN') {
      setActiveTab('admin');
    } else {
      setActiveTab('mixed');
    }

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
      } catch {}
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
      setActiveTab('mixed');
    }
  };

  const navItems = [
    { id: 'mixed', label: t('nav.mixedCropping'), icon: Layers, primary: true },
    { id: 'profileForm', label: t('nav.profile'), icon: Sprout },
    { id: 'lands', label: t('nav.lands'), icon: Compass },
    { id: 'resources', label: t('nav.resources'), icon: Boxes },
    { id: 'recommendations', label: t('nav.recommendations'), icon: TrendingUp },
    { id: 'profit', label: t('nav.profitAnalysis'), icon: PieChart },
    { id: 'roadmap', label: t('nav.roadmap'), icon: Calendar },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'chat', label: t('nav.chat'), icon: MessageSquare },
    ...(user?.role === 'ADMIN' ? [{ id: 'admin', label: t('nav.admin'), icon: ShieldCheck }] : [])
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  const displayName = user ? (user.full_name || user.name || 'সম্মানিত কৃষক') : '';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <a href="#main-content" className="sr-only focus:not-sr-only bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold">
        {lang === 'bn' ? 'মূল বিষয়বস্তুতে যান' : 'Skip to content'}
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
                    {t('appTitle')}
                  </span>
                  <span className="hidden sm:inline-block text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    v2.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden md:block font-bangla">
                  {t('appSubtitle')}
                </p>
              </div>
            </div>

            {/* Right: Language Switcher, User & Auth Buttons */}
            <div className="flex items-center gap-2.5">
              {/* Bilingual Toggle Button */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer border border-slate-200"
                title="ভাষা পরিবর্তন করুন / Change Language"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t('languageToggle')}</span>
              </button>

              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-2xl border border-slate-200">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {displayName.charAt(0)}
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-bold text-slate-800 leading-tight font-bangla">{displayName}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        {user.role === 'ADMIN' ? (
                          <><ShieldCheck className="w-3 h-3" /> {t('adminRole')}</>
                        ) : (
                          <><Tractor className="w-3 h-3" /> {t('farmerRole')}</>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('logout')}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setInitialAdminMode(false); setIsAuthModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow transition cursor-pointer font-bangla"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{t('login')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setInitialAdminMode(true); setIsAuthModalOpen(true); }}
                    className="hidden sm:flex items-center gap-1 px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition cursor-pointer font-bangla"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t('adminLogin')}</span>
                  </button>
                </div>
              )}

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-xl lg:hidden cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* -------------------- Horizontal Navigation Bar -------------------- */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer font-bangla ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : item.primary
                        ? 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* -------------------- Main Content Area -------------------- */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Logged Out Visitor Welcome Banner */}
        {!user && (
          <div className="mb-8 relative overflow-hidden bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-emerald-200 border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                {t('badgeText')}
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight font-bangla">
                {t('hero.title')}
              </h1>
              <p className="text-emerald-100 text-sm sm:text-base leading-relaxed font-bangla">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-5 py-3 bg-white text-emerald-900 font-bold rounded-xl shadow-lg hover:bg-emerald-50 transition cursor-pointer font-bangla text-xs sm:text-sm flex items-center gap-2"
                >
                  <span>{t('hero.getStarted')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('mixed')}
                  className="px-5 py-3 bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold rounded-xl border border-emerald-500/40 transition cursor-pointer font-bangla text-xs sm:text-sm"
                >
                  {t('hero.viewMixed')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Views Rendering based on activeTab */}
        <div className="space-y-6">
          {activeTab === 'mixed' && (
            <MixedCroppingView
              onNavigateToRoadmap={(combo) => {
                setSelectedComboForView(combo);
                setActiveTab('roadmap');
              }}
              onNavigateToProfit={(combo) => {
                setSelectedComboForView(combo);
                setActiveTab('profit');
              }}
            />
          )}

          {activeTab === 'profileForm' && (
            <FarmProfileForm onProfileSaved={handleProfileSaved} />
          )}

          {activeTab === 'lands' && (
            <LandManager />
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

          {activeTab === 'profit' && (
            <ProfitAnalysisDashboard initialCombo={selectedComboForView} />
          )}

          {activeTab === 'roadmap' && (
            <FarmingRoadmapView roadmapData={selectedComboForView?.cultivation_roadmap || null} />
          )}

          {activeTab === 'history' && (
            <RecommendationHistory />
          )}

          {activeTab === 'chat' && (
            <BanglaChatAssistant />
          )}

          {activeTab === 'admin' && (
            <AdminDashboard />
          )}
        </div>
      </main>

      {/* -------------------- Footer -------------------- */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-slate-800">agroWish</span> — {t('appSubtitle')}
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>DAE / BARI / BRRI Certified</span>
            <span>•</span>
            <span>Version 2.0.0</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialAdminMode={initialAdminMode}
      />
    </div>
  );
}

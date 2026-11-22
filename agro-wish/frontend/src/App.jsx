/**
 * agroWish Frontend - Main Application Shell & Capstone Integrated Dashboard
 * SE-331 Software Engineering Design Capstone Project
 * - Member 1: Md Adnan Ul Islam (ID: 241-35-103) - AI & Recommendation Lead
 * - Member 2: Most Tasnim Jahan Rifa (ID: 241-35-116) - Backend & Data Lead
 * - Member 3: Tasdid Al Amin (ID: 241-35-108) - Frontend & Usability Lead
 * 
 * SRS Reference:
 * - Section 5: FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-14, FR-15, FR-16, FR-30, FR-31, FR-35
 * - Section 6: NFR-01, NFR-03, NFR-04
 * - Section 7.4: ERD
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
  Calendar, 
  CheckCircle, 
  Database, 
  ArrowRight, 
  Sparkles, 
  Wheat,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Sparkle
} from 'lucide-react';
import AuthModal from './components/AuthModal';
import FarmProfileForm from './components/FarmProfileForm';
import RecommendationList from './components/RecommendationList';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [profileSummary, setProfileSummary] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  
  // Dashboard Tabs: 'profileForm' | 'recommendations'
  const [activeTab, setActiveTab] = useState('profileForm');

  // Restore stored session and verify token on startup (FR-31)
  useEffect(() => {
    const savedToken = localStorage.getItem('agrowish_token');
    const savedUser = localStorage.getItem('agrowish_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);

        // Verify active token session with backend GET /api/auth/me
        fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${savedToken}`
          }
        })
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error('Session invalid');
          })
          .then((data) => {
            if (data.success && data.user) {
              setUser(data.user);
              localStorage.setItem('agrowish_user', JSON.stringify(data.user));
            }
          })
          .catch(() => {
            handleLogout();
          });
      } catch (err) {
        handleLogout();
      }
    } else {
      setIsAuthModalOpen(true);
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser, authToken) => {
    setUser(authenticatedUser);
    setToken(authToken);
    setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        // Silently continue
      }
    }
    localStorage.removeItem('agrowish_token');
    localStorage.removeItem('agrowish_user');
    setUser(null);
    setToken(null);
    setProfileSummary(null);
    setIsProfileComplete(false);
    setIsAuthModalOpen(true);
  };

  // Callback when profile is saved in FarmProfileForm
  const handleProfileSaved = (updatedProfile, complete) => {
    setProfileSummary(updatedProfile);
    setIsProfileComplete(complete);
    // Smoothly transition to recommendations tab once complete
    if (complete) {
      setActiveTab('recommendations');
    }
  };

  const displayName = user ? (user.full_name || user.name || 'সম্মানিত কৃষক') : '';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* -------------------- Top Navigation Bar -------------------- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            
            {/* Left: Branding & Course Info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl shadow-md shadow-emerald-500/20">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                    agroWish
                  </span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    SE-331 Capstone
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  স্মার্ট কৃষি সহায়ক ও ফসল পরিকল্পনা প্ল্যাটফর্ম
                </p>
              </div>
            </div>

            {/* Right: Farmer's Name & Logout Button */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2.5 bg-slate-100/90 hover:bg-slate-100 py-1.5 px-3 rounded-2xl border border-slate-200 transition-all">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {displayName.charAt(0)}
                    </div>
                    <div className="text-left hidden md:block">
                      <div className="text-xs font-bold text-slate-800 leading-tight">
                        {displayName}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        {user.role === 'ADMIN' ? (
                          <>
                            <ShieldCheck className="w-3 h-3" /> অ্যাডমিন
                          </>
                        ) : (
                          <>
                            <Tractor className="w-3 h-3" /> কৃষক সদস্য
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="লগআউট করুন"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-all duration-200 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">লগআউট</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>লগইন / নিবন্ধন</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* -------------------- Main Workspace Content -------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          /* ================= Authenticated Farmer View ================= */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Welcome Greeting Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-emerald-200 border border-white/15 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  সক্রিয় সেশন: {user.role === 'ADMIN' ? 'সিস্টেম অ্যাডমিনিস্ট্রেটর' : 'নিবন্ধিত কৃষক সদস্য'}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  স্বাগতম, {displayName}! 🌱
                </h1>
                <p className="mt-2 text-emerald-100 text-xs sm:text-sm leading-relaxed">
                  আপনার খামারের মাটি, পানির উৎস ও মৌসুমি বৈশিষ্ট্যের ভিত্তিতে agroWish এআই সেরা ফসল এবং সার ব্যবহারের নির্ভুল পরামর্শ তৈরি করবে।
                </p>

                {/* Farmer Details */}
                <div className="mt-5 flex flex-wrap gap-2.5 text-xs">
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                    <Mail className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                      <Phone className="w-3.5 h-3.5 text-emerald-300" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                    <Database className="w-3.5 h-3.5 text-emerald-300" />
                    <span>আইডি #{user.id || user.user_id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Status Summary Card */}
            <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
              isProfileComplete 
                ? 'bg-emerald-50/70 border-emerald-200' 
                : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-2xl flex-shrink-0 ${
                    isProfileComplete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {isProfileComplete ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">
                        খামার প্রোফাইল স্ট্যাটাস: {isProfileComplete ? 'সম্পূর্ণ (Complete)' : 'অপূর্ণ (Pending)'}
                      </h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isProfileComplete ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {isProfileComplete ? 'সক্রিয় ও প্রস্তুত' : 'তথ্য পূরণ আবশ্যক'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {isProfileComplete 
                        ? `আপনার খামারের জেলা: ${profileSummary?.district || ''}, জমি: ${profileSummary?.land_size || 0} শতক, মাটি: ${profileSummary?.soil_type || ''}, মৌসুম: ${profileSummary?.season || ''}।`
                        : 'যথাযথ ফসল ও সারের সুপারিশ পেতে নিচে আপনার জমির পরিমাণ, মাটি ও মৌসুমি তথ্য পূরণ করে সংরক্ষণ করুন।'}
                    </p>
                  </div>
                </div>

                {isProfileComplete && (
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>সুপারিশসমূহ দেখুন</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Navigation: Farm Condition Form vs Recommendations */}
            <div className="flex bg-slate-200/80 p-1.5 rounded-2xl border border-slate-200 max-w-lg">
              <button
                type="button"
                onClick={() => setActiveTab('profileForm')}
                className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'profileForm'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>আমার খামারের তথ্য (FR-04)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recommendations')}
                className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'recommendations'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>উপযুক্ত ফসলের সুপারিশ ও বাজেট (FR-08)</span>
              </button>
            </div>

            {/* TAB CONTENT 1: Farm Condition Form */}
            {activeTab === 'profileForm' && (
              <div className="space-y-8 animate-in fade-in">
                <FarmProfileForm onProfileSaved={handleProfileSaved} />
              </div>
            )}

            {/* TAB CONTENT 2: AI Crop Recommendation & Costing */}
            {activeTab === 'recommendations' && (
              <div className="space-y-8 animate-in fade-in">
                <RecommendationList onNavigateToProfile={() => setActiveTab('profileForm')} />
              </div>
            )}
          </div>
        ) : (
          /* ================= Unauthenticated Hero ================= */
          <div className="py-12 max-w-4xl mx-auto text-center space-y-8 animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>SE-331 Software Engineering Design Capstone Project</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              স্মার্ট কৃষি ও ফসল নির্বাচনের <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                আধুনিক ডিজিটাল সহায়ক
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              agroWish বাংলাদেশের প্রান্তিক কৃষকদের জন্য মাটির ধরণ, ভৌগোলিক অবস্থান, বাজেট এবং জলবায়ু পর্যালোচনা করে সর্বোত্তম লাভজনক ফসল ও সার ব্যবহারের সঠিক পরামর্শ প্রদান করে।
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm sm:text-base"
              >
                <span>নিবন্ধন অথবা লগইন করুন</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* -------------------- Footer -------------------- */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">agroWish</span>
            <span>&copy; {new Date().getFullYear()} - SE-331 Software Engineering Design Capstone Project</span>
          </div>
          <div>
            <span>AI & Backend Lead: Md Adnan Ul Islam (ID: 241-35-103)</span>
          </div>
        </div>
      </footer>

      {/* -------------------- Bangla Auth Modal -------------------- */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

/**
 * agroWish Frontend - Bilingual Agricultural Auth Modal
 * Supports Farmer Registration with Date of Birth & Phone,
 * Login with Phone/Email, and Dedicated Admin Authentication.
 */

import React, { useState } from 'react';
import {
  Sprout,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Tractor,
  ShieldCheck,
  X
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialAdminMode = false }) {
  const { lang, t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(initialAdminMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    confirmPassword: '',
    identifier: '' // can be phone or email for login
  });

  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  const BD_PHONE_REGEX = /^(?:\+8801|01)[3-9]\d{8}$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login API Call
        const endpoint = isAdminMode ? '/api/auth/admin-login' : '/api/auth/login';
        const bodyPayload = {
          identifier: formData.identifier || formData.email || formData.phone,
          password: formData.password
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে।' : 'Login failed.'));
        }

        setSuccessMessage(data.message);
        localStorage.setItem('agrowish_token', data.token);
        localStorage.setItem('agrowish_user', JSON.stringify(data.user));

        setTimeout(() => {
          onAuthSuccess(data.user, data.token);
        }, 500);

      } else {
        // Register API Call
        if (formData.password !== formData.confirmPassword) {
          setErrorMessage(lang === 'bn' ? 'পাসওয়ার্ড মেলেনি।' : 'Passwords do not match.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: formData.full_name,
            phone: formData.phone,
            email: formData.email,
            dob: formData.dob,
            password: formData.password,
            role: isAdminMode ? 'ADMIN' : 'FARMER'
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || (lang === 'bn' ? 'নিবন্ধন ব্যর্থ হয়েছে।' : 'Registration failed.'));
        }

        setSuccessMessage(data.message);
        localStorage.setItem('agrowish_token', data.token);
        localStorage.setItem('agrowish_user', JSON.stringify(data.user));

        setTimeout(() => {
          onAuthSuccess(data.user, data.token);
        }, 600);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon Header */}
        <div className="text-center mb-6">
          <div className={`w-12 h-12 ${isAdminMode ? 'bg-purple-700' : 'bg-emerald-700'} text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md`}>
            {isAdminMode ? <ShieldCheck className="w-6 h-6" /> : <Sprout className="w-6 h-6" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-bangla">
            {isAdminMode
              ? (lang === 'bn' ? 'অ্যাডমিন প্রবেশদ্বার' : 'Admin Portal Access')
              : (isLogin
                  ? (lang === 'bn' ? 'কৃষক লগইন' : 'Farmer Login')
                  : (lang === 'bn' ? 'নতুন কৃষক নিবন্ধন' : 'Farmer Registration')
                )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isAdminMode
              ? (lang === 'bn' ? 'শুধুমাত্র অনুমোদিত প্রশাসনিক কর্মকর্তাদের জন্য' : 'Restricted to authorized system administrators')
              : (lang === 'bn' ? 'মোবাইল নম্বর অথবা ইমেইল দিয়ে সহজে প্রবেশ করুন' : 'Sign in easily using your phone number or email')}
          </p>
        </div>

        {/* Tab Selector: Login vs Register */}
        {!isAdminMode && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setErrorMessage(''); }}
              className={`flex-1 py-2 rounded-lg transition font-bangla ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              {lang === 'bn' ? 'লগইন' : 'Log In'}
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setErrorMessage(''); }}
              className={`flex-1 py-2 rounded-lg transition font-bangla ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              {lang === 'bn' ? 'নতুন একাউন্ট' : 'Register'}
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Registration Fields */}
          {!isLogin && (
            <>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'} *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    name="full_name"
                    required
                    placeholder={lang === 'bn' ? 'যেমন: মোঃ আব্দুল করিম' : 'e.g. Md Abdul Karim'}
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bangla"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'bn' ? 'মোবাইল নম্বর (১১ ডিজিট)' : 'Mobile Phone (11 digits)'} *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="017XXXXXXXX"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'bn' ? 'জন্ম তারিখ (ঐচ্ছিক)' : 'Date of Birth (Optional)'}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'bn' ? 'ইমেইল ঠিকানা (ঐচ্ছিক)' : 'Email Address (Optional)'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="farmer@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Login Identifier Field */}
          {isLogin && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {isAdminMode
                  ? (lang === 'bn' ? 'অ্যাডমিন ইমেইল বা ইউজারনেম' : 'Admin Email or Username')
                  : (lang === 'bn' ? 'মোবাইল নম্বর অথবা ইমেইল' : 'Mobile Number or Email')} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  name="identifier"
                  required
                  placeholder={isAdminMode ? 'admin@agrowish.com' : '017XXXXXXXX বা ইমেইল'}
                  value={formData.identifier}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bangla"
                />
              </div>
            </div>
          )}

          {/* Password Field */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {lang === 'bn' ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min. 6 characters)'} *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password for Registration */}
          {!isLogin && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'} *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 ${
              isAdminMode ? 'bg-purple-700 hover:bg-purple-800' : 'bg-emerald-700 hover:bg-emerald-800'
            } text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer font-bangla mt-4`}
          >
            {loading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <span>{isLogin ? (lang === 'bn' ? 'প্রবেশ করুন' : 'Sign In') : (lang === 'bn' ? 'নিবন্ধন সম্পন্ন করুন' : 'Complete Registration')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Admin Switcher */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bangla">
          <button
            type="button"
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              setIsLogin(true);
              setErrorMessage('');
            }}
            className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
          >
            {isAdminMode ? 'কৃষক লগইনে ফিরে যান' : 'অ্যাডমিন লগইন পোর্টাল'}
          </button>

          <span className="text-slate-400">agroWish v2.0</span>
        </div>
      </div>
    </div>
  );
}

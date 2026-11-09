/**
 * agroWish Frontend - Bangla Agricultural Auth Modal
 * SE-331 Software Engineering Design Capstone Project
 * Member 2: Most Tasnim Jahan Rifa (ID: 241-35-116)
 * 
 * SRS Reference: Section 5 (FR-01, FR-07), Section 6 (NFR-04)
 */

import React, { useState } from 'react';
import { 
  Sprout, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Tractor, 
  ShieldCheck,
  X
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'FARMER'
  });

  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  // RFC-compliant email regex
  const RFC_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  // Bangladeshi 11-digit phone regex
  const BD_PHONE_REGEX = /^(?:\+8801|01)[3-9]\d{8}$/;

  const validateField = (name, value, allValues = formData) => {
    let error = '';

    if (name === 'full_name' && !isLogin) {
      if (!value.trim()) {
        error = 'সকল তথ্য পূরণ করুন (নাম প্রদান করুন)';
      } else if (value.trim().length < 2) {
        error = 'পূর্ণ নাম কমপক্ষে ২ অক্ষরের হতে হবে';
      }
    }

    if (name === 'phone' && !isLogin) {
      const cleanPhone = value.replace(/\s+/g, '');
      if (!cleanPhone) {
        error = 'সকল তথ্য পূরণ করুন (মোবাইল নম্বর প্রদান করুন)';
      } else if (!BD_PHONE_REGEX.test(cleanPhone)) {
        error = 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)';
      }
    }

    if (name === 'email') {
      const cleanEmail = value.trim();
      if (!cleanEmail) {
        error = 'সকল তথ্য পূরণ করুন (ইমেইল ঠিকানা দিন)';
      } else if (!RFC_EMAIL_REGEX.test(cleanEmail)) {
        error = 'সঠিক ইমেইল ঠিকানা দিন';
      }
    }

    if (name === 'password') {
      if (!value) {
        error = 'পাসওয়ার্ড প্রদান করুন';
      } else if (value.length < 6) {
        error = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে';
      }
    }

    if (name === 'confirmPassword' && !isLogin) {
      if (value !== allValues.password) {
        error = 'পাসওয়ার্ড মেলেনি (উভয় পাসওয়ার্ড একই হতে হবে)';
      }
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedValues = { ...formData, [name]: value };
    setFormData(updatedValues);

    // Real-time client-side validation
    const error = validateField(name, value, updatedValues);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));

    if (errorMessage) setErrorMessage('');
  };

  const validateAll = () => {
    const errors = {};

    if (!isLogin) {
      const nameErr = validateField('full_name', formData.full_name);
      if (nameErr) errors.full_name = nameErr;

      const phoneErr = validateField('phone', formData.phone);
      if (phoneErr) errors.phone = phoneErr;

      const confirmErr = validateField('confirmPassword', formData.confirmPassword);
      if (confirmErr) errors.confirmPassword = confirmErr;
    }

    const emailErr = validateField('email', formData.email);
    if (emailErr) errors.email = emailErr;

    const passErr = validateField('password', formData.password);
    if (passErr) errors.password = passErr;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setErrorMessage('অনুগ্রহ করে সঠিক তথ্য দিয়ে ফরম পূরণ করুন।');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateAll()) return;

    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'অনুরোধটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।');
      }

      setSuccessMessage(data.message || (isLogin ? 'লগইন সফল হয়েছে!' : 'নিবন্ধন সম্পন্ন হয়েছে!'));

      // Save token and user payload in localStorage
      if (data.token) {
        localStorage.setItem('agrowish_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('agrowish_user', JSON.stringify(data.user));
      }

      setTimeout(() => {
        if (onAuthSuccess) {
          onAuthSuccess(data.user, data.token);
        }
        if (onClose) {
          onClose();
        }
      }, 600);

    } catch (err) {
      setErrorMessage(err.message || 'নেটওয়ার্ক সংযোগে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (toLogin) => {
    setIsLogin(toLogin);
    setErrorMessage('');
    setSuccessMessage('');
    setFieldErrors({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (if onClose provided) */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-all cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Agricultural Header Banner */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-8 -top-8 w-28 h-28 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl mb-3 shadow-inner border border-white/25">
            <Sprout className="w-8 h-8 text-emerald-200" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">agroWish (অ্যাগ্রোউইশ)</h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            বাংলাদেশের কৃষকদের নির্ভরযোগ্য ডিজিটাল পরামর্শ ও পরিকল্পনা
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="p-6 pb-2">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => switchTab(true)}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                isLogin
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              লগইন করুন
            </button>
            <button
              type="button"
              onClick={() => switchTab(false)}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                !isLogin
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              নতুন কৃষক নিবন্ধন
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6 pt-3">
          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registration-Only Inputs */}
            {!isLogin && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    সম্পূর্ণ নাম <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                      className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.full_name
                          ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                          : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.full_name && (
                    <p className="text-xs text-rose-500 mt-1">{fieldErrors.full_name}</p>
                  )}
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    মোবাইল নম্বর <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="017XXXXXXXX"
                      className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.phone
                          ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                          : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-xs text-rose-500 mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Account Role Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    অ্যাকাউন্টের ভূমিকা (Account Role)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, role: 'FARMER' }))}
                      className={`flex items-center justify-center gap-2 p-2.5 border rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        formData.role === 'FARMER'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Tractor className="w-4 h-4 text-emerald-600" />
                      <span>কৃষক (FARMER)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, role: 'ADMIN' }))}
                      className={`flex items-center justify-center gap-2 p-2.5 border rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        formData.role === 'ADMIN'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>অ্যাডমিন (ADMIN)</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ইমেইল ঠিকানা <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="farmer@example.com"
                  className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.email
                      ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                      : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                পাসওয়ার্ড <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-11 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password
                      ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                      : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'লুকান' : 'দেখান'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password (Registration Only) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  পাসওয়ার্ড নিশ্চিত করুন <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.confirmPassword
                        ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                        : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-rose-500 mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer text-xs sm:text-sm"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>অনুরোধ প্রক্রিয়াধীন...</span>
                </div>
              ) : (
                <>
                  <span>{isLogin ? 'লগইন সম্পন্ন করুন' : 'অ্যাকাউন্ট তৈরি করুন'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Academic Footer */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>SE-331 Capstone Project</span>
            <span>Auth & DB Lead: Most Tasnim Jahan Rifa</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * agroWish Frontend - Farmer Farm Condition & Resource Inventory Form
 * SE-331 Software Engineering Design Capstone Project
 * Member 3: Tasdid Al Amin (ID: 241-35-108)
 * Lead: Frontend & Usability Lead
 * 
 * SRS Reference:
 * - Section 5: FR-03, FR-04 (Land/Soil), FR-05 (Budget), FR-06 (Resources), FR-07 (Validation), FR-17 (Bangla), FR-30 (Status)
 * - Section 6: NFR-03 (Usability and Mobile-First Responsive Design)
 */

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Layers, 
  Droplet, 
  Calendar, 
  Wallet, 
  Waves, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sparkles, 
  Wheat, 
  HelpCircle,
  Egg,
  Feather,
  Recycle,
  Fish
} from 'lucide-react';

// Common Bangladeshi agricultural districts for quick selection
const BD_DISTRICTS = [
  'ঢাকা (Dhaka)',
  'বগুড়া (Bogura)',
  'দিনাজপুর (Dinajpur)',
  'রংপুর (Rangpur)',
  'ময়মনসিংহ (Mymensingh)',
  'রাজশাহী (Rajshahi)',
  'যশোর (Jashore)',
  'কুমিল্লা (Cumilla)',
  'মুন্সীগঞ্জ (Munshiganj)',
  'সিলেট (Sylhet)',
  'কুষ্টিয়া (Kushtia)',
  'চুয়াডাঙ্গা (Chuadanga)',
  'টাঙ্গাইল (Tangail)',
  'ফরিদপুর (Faridpur)',
  'বরিশাল (Barishal)',
  'পাবনা (Pabna)',
  'জামালপুর (Jamalpur)',
  'অন্যান্য (Other)'
];

const SOIL_OPTIONS = [
  { value: 'দোআঁশ', label: 'দোআঁশ (Loamy)', desc: 'সব ধরণের ফসলের জন্য আদর্শ' },
  { value: 'বেলে', label: 'বেলে (Sandy)', desc: 'পানি নিষ্কাশন দ্রুত, আলু ও বাদাম উপযোগী' },
  { value: 'এঁটেল', label: 'এঁটেল (Clay)', desc: 'পানি ধারণক্ষমতা বেশি, ধান উপযোগী' },
  { value: 'পলি', label: 'পলি (Silty)', desc: 'নদীর অববাহিকা ও উর্বর পলিযুক্ত মাটি' }
];

const WATER_OPTIONS = [
  { value: 'উচ্চ', label: 'উচ্চ (সেচ সুবিধা নিশ্চিত)', color: 'emerald' },
  { value: 'মাঝারি', label: 'মাঝারি (সম্পূরক সেচ)', color: 'teal' },
  { value: 'স্বল্প', label: 'স্বল্প (বৃষ্টি-নির্ভর)', color: 'amber' }
];

const SEASON_OPTIONS = [
  { value: 'রবি', label: 'রবি মৌসুম (অক্টোবর - মার্চ)', tag: 'বোরো, গম, আলু, ভুট্টা' },
  { value: 'খরিপ-১', label: 'খরিপ-১ মৌসুম (মার্চ - জুন)', tag: 'আউশ, পাট, গ্রীষ্মকালীন সবজি' },
  { value: 'খরিপ-২', label: 'খরিপ-২ মৌসুম (জুলাই - নভেম্বর)', tag: 'আমন ধান' }
];

const RESOURCE_OPTIONS = [
  { key: 'dairy', label: 'গবাদিপশু (গরু/মহিষ)', icon: Feather },
  { key: 'poultry', label: 'হাঁস-মুরগি (পোল্ট্রি)', icon: Egg },
  { key: 'crop_residues', label: 'ফসলের উচ্ছিষ্ট (খড়/নাড়া)', icon: Wheat },
  { key: 'compost', label: 'জৈব সার/কম্পোস্ট খামার', icon: Recycle },
  { key: 'fisheries', label: 'মাছ চাষের পুকুর/ঘের', icon: Fish }
];

export default function FarmProfileForm({ onProfileSaved }) {
  // Form input state
  const [formData, setFormData] = useState({
    district: 'বগুড়া (Bogura)',
    upazila: '',
    land_size: '',
    soil_type: 'দোআঁশ',
    water_availability: 'উচ্চ',
    season: 'রবি',
    budget: '',
    has_pond: false,
    pond_size: '',
    existing_resources: []
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch saved farm conditions on mount (GET /api/profile/me)
  useEffect(() => {
    const fetchExistingProfile = async () => {
      const token = localStorage.getItem('agrowish_token');
      if (!token) {
        setInitialLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/profile/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success && data.profile) {
          const p = data.profile;
          setFormData({
            district: p.district || 'বগুড়া (Bogura)',
            upazila: p.upazila || '',
            land_size: p.land_size !== null && p.land_size !== undefined ? p.land_size : '',
            soil_type: p.soil_type || 'দোআঁশ',
            water_availability: p.water_availability || 'উচ্চ',
            season: p.season || 'রবি',
            budget: p.budget !== null && p.budget !== undefined ? p.budget : '',
            has_pond: Boolean(p.has_pond),
            pond_size: p.pond_size !== null && p.pond_size !== undefined ? p.pond_size : '',
            existing_resources: Array.isArray(p.existing_resources) ? p.existing_resources : []
          });

          if (onProfileSaved) {
            onProfileSaved(p, data.isComplete);
          }
        }
      } catch (err) {
        console.warn('[FarmProfileForm] Could not fetch saved profile:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchExistingProfile();
  }, []);

  // Real-time client-side field validation (FR-07)
  const validateField = (name, value, currentFormData = formData) => {
    let err = '';

    if (name === 'district') {
      if (!value || !value.trim()) err = 'অনুগ্রহ করে আপনার জেলা নির্বাচন করুন';
    }

    if (name === 'upazila') {
      if (!value || !value.trim()) err = 'অনুগ্রহ করে আপনার উপজেলা লিখুন';
    }

    if (name === 'land_size') {
      const num = parseFloat(value);
      if (value === '' || isNaN(num) || num <= 0) {
        err = 'জমির পরিমাণ শূন্যের বেশি হতে হবে (শতক এককে লিখুন)';
      }
    }

    if (name === 'budget') {
      const num = parseFloat(value);
      if (value === '' || isNaN(num) || num < 0) {
        err = 'বাজেট সঠিকভাবে লিখুন (কমপক্ষে ০ টাকা)';
      }
    }

    if (name === 'pond_size' && currentFormData.has_pond) {
      if (value !== '' && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
        err = 'পুকুরের পরিমাপ সঠিক সংখ্যায় লিখুন';
      }
    }

    return err;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    const updated = { ...formData, [name]: finalValue };
    setFormData(updated);

    const err = validateField(name, finalValue, updated);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));

    if (errorMessage) setErrorMessage('');
    if (successMessage) setSuccessMessage('');
  };

  // Toggle existing resources in array
  const handleResourceToggle = (resourceKey) => {
    setFormData((prev) => {
      const current = prev.existing_resources || [];
      const updated = current.includes(resourceKey)
        ? current.filter((k) => k !== resourceKey)
        : [...current, resourceKey];
      return { ...prev, existing_resources: updated };
    });
  };

  const validateAll = () => {
    const errors = {};
    const districtErr = validateField('district', formData.district);
    if (districtErr) errors.district = districtErr;

    const upazilaErr = validateField('upazila', formData.upazila);
    if (upazilaErr) errors.upazila = upazilaErr;

    const landErr = validateField('land_size', formData.land_size);
    if (landErr) errors.land_size = landErr;

    const budgetErr = validateField('budget', formData.budget);
    if (budgetErr) errors.budget = budgetErr;

    if (formData.has_pond && formData.pond_size) {
      const pondErr = validateField('pond_size', formData.pond_size);
      if (pondErr) errors.pond_size = pondErr;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateAll()) {
      setErrorMessage('অনুগ্রহ করে ফরমের প্রয়োজনীয় তথ্যগুলো সঠিকভাবে পূরণ করুন।');
      return;
    }

    const token = localStorage.getItem('agrowish_token');
    if (!token) {
      setErrorMessage('অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে পুনরায় লগইন করুন।');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        district: formData.district,
        upazila: formData.upazila,
        land_size: parseFloat(formData.land_size),
        soil_type: formData.soil_type,
        water_availability: formData.water_availability,
        season: formData.season,
        budget: parseFloat(formData.budget),
        has_pond: Boolean(formData.has_pond),
        pond_size: formData.has_pond && formData.pond_size ? parseFloat(formData.pond_size) : 0,
        existing_resources: formData.existing_resources
      };

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'খামারের তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।');
      }

      setSuccessMessage('আপনার খামারের তথ্য সফলভাবে সংরক্ষিত হয়েছে!');
      if (onProfileSaved) {
        onProfileSaved(data.profile, true);
      }
    } catch (err) {
      setErrorMessage(err.message || 'সার্ভার সংযোগে ত্রুটি দেখা দিয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">খামারের তথ্য লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              খামারের বর্তমান অবস্থা ও সম্পদ সমীক্ষা (FR-04, FR-06)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            আপনার খামারের মাটি, পানির উৎস, বাজেট ও বিদ্যমান সম্পদ দিন যাতে এআই সঠিক ফসল নির্ধারণ করতে পারে।
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Member 3 UI Module</span>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMessage && (
        <div className="mt-6 flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
          <div className="font-medium">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="mt-6 flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <div className="font-semibold">{successMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        
        {/* ============================================================== */}
        {/* CARD 1: জমির ও মাটির তথ্য                                      */}
        {/* ============================================================== */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-5">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-3 border-b border-slate-200/60">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>১. জমি ও ভৌগোলিক তথ্য (Land & Location)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* District */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                জেলা (District) <span className="text-rose-500">*</span>
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleChange}
                className={`w-full py-2.5 px-3 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.district
                    ? 'border-rose-300 focus:ring-rose-400'
                    : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              >
                {BD_DISTRICTS.map((dist, idx) => (
                  <option key={idx} value={dist}>{dist}</option>
                ))}
              </select>
              {fieldErrors.district && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.district}</p>
              )}
            </div>

            {/* Upazila */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                উপজেলা (Upazila) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="upazila"
                value={formData.upazila}
                onChange={handleChange}
                placeholder="যেমন: শেরপুর, শিবগঞ্জ বা সদর"
                className={`w-full py-2.5 px-3 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.upazila
                    ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/10'
                    : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              {fieldErrors.upazila && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.upazila}</p>
              )}
            </div>

            {/* Land Size (শতক) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                চাষযোগ্য জমির পরিমাণ (শতক/শতাংশ) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  name="land_size"
                  value={formData.land_size}
                  onChange={handleChange}
                  placeholder="যেমন: ২৫ বা ৫০"
                  className={`w-full py-2.5 pl-3 pr-14 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.land_size
                      ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/10'
                      : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                  শতক
                </span>
              </div>
              {fieldErrors.land_size && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.land_size}</p>
              )}
            </div>
          </div>

          {/* Soil Type and Water Availability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Soil Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                মাটির ধরন (Soil Type) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SOIL_OPTIONS.map((soil) => (
                  <button
                    key={soil.value}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, soil_type: soil.value }))}
                    className={`p-3 text-left border rounded-xl transition-all cursor-pointer ${
                      formData.soil_type === soil.value
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{soil.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{soil.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Water Availability */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                পানির প্রাপ্যতা ও সেচ সুবিধা (Water Availability) <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                {WATER_OPTIONS.map((water) => (
                  <button
                    key={water.value}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, water_availability: water.value }))}
                    className={`w-full p-2.5 px-3 flex items-center justify-between border rounded-xl transition-all cursor-pointer ${
                      formData.water_availability === water.value
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Droplet className={`w-4 h-4 ${formData.water_availability === water.value ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-medium">{water.label}</span>
                    </div>
                    {formData.water_availability === water.value && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CARD 2: মৌসুম ও বিনিয়োগ সক্ষমতা                              */}
        {/* ============================================================== */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-5">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-3 border-b border-slate-200/60">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>২. মৌসুম ও বাজেট পরিকল্পনা (Season & Budget - FR-05)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Season Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                বর্তমান চাষাবাদ মৌসুম <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                {SEASON_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, season: s.value }))}
                    className={`w-full p-3 text-left border rounded-xl transition-all cursor-pointer ${
                      formData.season === s.value
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{s.label}</span>
                      {formData.season === s.value && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">উপযোগী ফসল: {s.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Farming Budget */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                চাষাবাদের জন্য নির্ধারিত মোট বাজেট (টাকা) <span className="text-rose-500">*</span>
              </label>
              <div className="bg-white p-4 border border-slate-200 rounded-2xl space-y-3">
                <div className="relative">
                  <Wallet className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="500"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="যেমন: ২৫০০০"
                    className={`w-full py-2.5 pl-10 pr-12 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.budget
                        ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/10'
                        : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                    ৳ (টাকা)
                  </span>
                </div>
                {fieldErrors.budget && (
                  <p className="text-xs text-rose-500">{fieldErrors.budget}</p>
                )}

                <div className="text-[11px] text-slate-500 leading-relaxed bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 flex items-start gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>
                    বীজ, সার, সেচ, বালাইনাশক এবং শ্রমিকের আনুমানিক মোট খরচ বিবেচনা করে আপনার বাজেট নির্ধারণ করুন।
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CARD 3: বিদ্যমান খামার সম্পদ (SRS FR-06)                      */}
        {/* ============================================================== */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-5">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-3 border-b border-slate-200/60">
            <Waves className="w-4 h-4 text-emerald-600" />
            <span>৩. বিদ্যমান খামার সম্পদ সমীক্ষা (Resource Inventory - FR-06)</span>
          </div>

          {/* Pond Toggle */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="has_pond"
                checked={formData.has_pond}
                onChange={handleChange}
                className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                খামারে কোনো সক্রিয় পুকুর বা জলাশয় আছে কি?
              </span>
            </label>

            {formData.has_pond && (
              <div className="pt-3 border-t border-slate-100 animate-in fade-in space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  পুকুরের আয়তন (শতক/শতাংশ)
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="pond_size"
                    value={formData.pond_size}
                    onChange={handleChange}
                    placeholder="যেমন: ১০ শতক"
                    className="w-full py-2 pl-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">
                    শতক
                  </span>
                </div>
                {fieldErrors.pond_size && (
                  <p className="text-xs text-rose-500">{fieldErrors.pond_size}</p>
                )}
              </div>
            )}
          </div>

          {/* Integrated Resources Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              অন্যান্য সহায়ক বা সমন্বিত কৃষি সম্পদ (টিক চিহ্ন দিন):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {RESOURCE_OPTIONS.map((res) => {
                const IconComponent = res.icon;
                const isChecked = (formData.existing_resources || []).includes(res.key);
                return (
                  <div
                    key={res.key}
                    onClick={() => handleResourceToggle(res.key)}
                    className={`p-3 border rounded-xl flex items-center gap-2.5 cursor-pointer transition-all ${
                      isChecked
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent onClick
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 pointer-events-none"
                    />
                    <IconComponent className={`w-4 h-4 ${isChecked ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span className="text-xs font-medium">{res.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Action (FR-30) */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs sm:text-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>সংরক্ষণ করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>খামারের তথ্য সংরক্ষণ করুন</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}


/**
 * agroWish Frontend - Resource Inventory & Farming Goal Manager
 * SRS Reference: FR-05 (Budget/Goal), FR-06 (Resource Inventory), FR-07 (Validation), FR-11 (Resource Planning), FR-27 (Data Isolation)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Waves,
  Feather,
  Egg,
  Wheat,
  Recycle,
  Droplet,
  Plus,
  Trash2,
  Wallet,
  Target,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

const RESOURCE_TYPES = [
  { value: 'pond', label: 'পুকুর / জলাশয় (Pond)', defaultUnit: 'শতক', icon: Waves },
  { value: 'livestock', label: 'গবাদিপশু - গরু/মহিষ/ছাগল (Livestock)', defaultUnit: 'টি', icon: Feather },
  { value: 'poultry', label: 'হাঁস-মুরগি / পোল্ট্রি (Poultry)', defaultUnit: 'টি', icon: Egg },
  { value: 'crop_residue', label: 'ফসলের উচ্ছিষ্ট / খড়-নাড়া (Crop Residue)', defaultUnit: 'কেজি', icon: Wheat },
  { value: 'organic_material', label: 'জৈব সার / কম্পোস্ট / কচুরিপানা (Organic)', defaultUnit: 'কেজি', icon: Recycle },
  { value: 'water', label: 'সেচ বা পানির উৎস (Water Source)', defaultUnit: 'পাম্প/ঘণ্টা', icon: Droplet }
];

const RISK_OPTIONS = [
  { value: 'LOW', label: 'কম ঝুঁকি ও স্থায়ী আয়' },
  { value: 'MEDIUM', label: 'সুষম ঝুঁকি ও লাভ' },
  { value: 'HIGH', label: 'উচ্চ মুনাফা (বাণিজ্যিক)' }
];

const GOAL_PRESETS = [
  'সুষম মুনাফা ও খাদ্য নিরাপত্তা',
  'সর্বোচ্চ বাণিজ্যিক মুনাফা অর্জন',
  'কম খরচে জৈব ও সমন্বিত চাষ',
  'পারিবারিক পুষ্টি ও স্বল্প ঝুঁকি'
];

export default function ResourceManager({ onGenerateIntegrated }) {
  const [resources, setResources] = useState([]);
  const [goals, setGoals] = useState({
    budget: '',
    farming_goal: 'সুষম মুনাফা ও খাদ্য নিরাপত্তা',
    risk_preference: 'MEDIUM'
  });

  const [newResource, setNewResource] = useState({
    resource_name: '',
    resource_type: 'pond',
    quantity: '',
    unit: 'শতক',
    notes: ''
  });

  const [loading, setLoading] = useState(true);
  const [savingGoals, setSavingGoals] = useState(false);
  const [addingResource, setAddingResource] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resErrors, setResErrors] = useState({});

  const nameInputRef = useRef(null);

  const fetchResourcesAndGoals = async () => {
    const token = localStorage.getItem('agrowish_token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/resources', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResources(data.resources || []);
        if (data.goals) {
          setGoals({
            budget: data.goals.budget !== undefined && data.goals.budget !== null ? String(data.goals.budget) : '',
            farming_goal: data.goals.farming_goal || 'সুষম মুনাফা ও খাদ্য নিরাপত্তা',
            risk_preference: data.goals.risk_preference || 'MEDIUM'
          });
        }
      }
    } catch (err) {
      setErrorMsg('সম্পদের তথ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResourcesAndGoals();
  }, []);

  const handleSaveGoals = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');

    const numBudget = parseFloat(goals.budget);
    if (goals.budget === '' || isNaN(numBudget) || numBudget < 0) {
      setErrorMsg('বাজেট সঠিকভাবে লিখুন (কমপক্ষে ০ টাকা)।');
      return;
    }

    const token = localStorage.getItem('agrowish_token');
    setSavingGoals(true);
    try {
      const res = await fetch('/api/resources/goals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          budget: numBudget,
          farming_goal: goals.farming_goal,
          risk_preference: goals.risk_preference
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'লক্ষ্য সংরক্ষণ ব্যর্থ হয়েছে।');
      setStatusMsg(data.message || 'লক্ষ্য ও বাজেট সংরক্ষিত হয়েছে!');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingGoals(false);
    }
  };

  const handleResourceTypeChange = (typeVal) => {
    const found = RESOURCE_TYPES.find((t) => t.value === typeVal);
    setNewResource((prev) => ({
      ...prev,
      resource_type: typeVal,
      unit: found ? found.defaultUnit : prev.unit
    }));
  };

  const validateResourceField = (field, value) => {
    if (field === 'resource_name' && (!value || value.trim().length < 2)) {
      return 'সম্পদের নাম কমপক্ষে ২ অক্ষরের হতে হবে';
    }
    if (field === 'quantity') {
      const n = parseFloat(value);
      if (value === '' || isNaN(n) || n <= 0) return 'পরিমাণ শূন্যের বেশি সংখ্যা লিখুন';
    }
    if (field === 'unit' && (!value || !value.trim())) {
      return 'একক উল্লেখ করুন';
    }
    return '';
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');

    const errs = {};
    const nameErr = validateResourceField('resource_name', newResource.resource_name);
    if (nameErr) errs.resource_name = nameErr;
    const qtyErr = validateResourceField('quantity', newResource.quantity);
    if (qtyErr) errs.quantity = qtyErr;
    const unitErr = validateResourceField('unit', newResource.unit);
    if (unitErr) errs.unit = unitErr;

    setResErrors(errs);
    if (Object.keys(errs).length > 0) {
      nameInputRef.current?.focus();
      return;
    }

    const token = localStorage.getItem('agrowish_token');
    setAddingResource(true);
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resource_name: newResource.resource_name.trim(),
          resource_type: newResource.resource_type,
          quantity: parseFloat(newResource.quantity),
          unit: newResource.unit.trim(),
          notes: newResource.notes.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'সম্পদ যোগ করতে সমস্যা হয়েছে।');

      setResources((prev) => [data.resource, ...prev]);
      setNewResource((prev) => ({ ...prev, resource_name: '', quantity: '', notes: '' }));
      setResErrors({});
      setStatusMsg(data.message || 'নতুন খামার সম্পদ যুক্ত হয়েছে!');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setAddingResource(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    setStatusMsg('');
    setErrorMsg('');
    const token = localStorage.getItem('agrowish_token');
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'মুছে ফেলা সম্ভব হয়নি।');
      setResources((prev) => prev.filter((r) => r.resource_id !== resourceId));
      setStatusMsg(data.message || 'সম্পদটি তালিকা থেকে সরানো হয়েছে।');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center min-h-[280px]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-600 font-medium">খামারের সম্পদ ও লক্ষ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status & Error Live Regions */}
      {statusMsg && (
        <div role="status" aria-live="polite" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2.5 text-xs sm:text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Farming Goals & Budget Card (FR-05) */}
      <section aria-labelledby="goals-heading" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Target className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="goals-heading" className="text-lg sm:text-xl font-bold text-slate-900">
                বাজেট ও চাষাবাদের লক্ষ্য নির্ধারণ
              </h2>
              <p className="text-xs text-slate-500">
                আপনার নির্ধারিত পুঁজি ও ঝুঁকির পছন্দ অনুযায়ী এআই ফসল ও সমন্বিত চাষ বাছাই করবে।
              </p>
            </div>
          </div>
          {onGenerateIntegrated && (
            <button
              type="button"
              onClick={onGenerateIntegrated}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>সমন্বিত সুপারিশ তৈরি করুন</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSaveGoals} className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="goal-budget" className="block text-xs font-semibold text-slate-700 mb-1.5">
              মোট বিনিয়োগ বাজেট (টাকা) <span className="text-rose-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Wallet className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" aria-hidden="true" />
              <input
                id="goal-budget"
                name="budget"
                type="number"
                min="0"
                step="500"
                required
                value={goals.budget}
                onChange={(e) => setGoals((p) => ({ ...p, budget: e.target.value }))}
                className="w-full min-h-12 pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                placeholder="যেমন: ৩৫০০০"
              />
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">৳</span>
            </div>
          </div>

          <div>
            <label htmlFor="goal-target" className="block text-xs font-semibold text-slate-700 mb-1.5">
              প্রধান লক্ষ্য (Farming Goal)
            </label>
            <select
              id="goal-target"
              name="farming_goal"
              value={goals.farming_goal}
              onChange={(e) => setGoals((p) => ({ ...p, farming_goal: e.target.value }))}
              className="w-full min-h-12 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
            >
              {GOAL_PRESETS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="goal-risk" className="block text-xs font-semibold text-slate-700 mb-1.5">
              ঝুঁকি গ্রহণের মাত্রা
            </label>
            <div className="flex gap-2">
              <select
                id="goal-risk"
                name="risk_preference"
                value={goals.risk_preference}
                onChange={(e) => setGoals((p) => ({ ...p, risk_preference: e.target.value }))}
                className="flex-1 min-h-12 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
              >
                {RISK_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={savingGoals}
                className="px-5 min-h-12 bg-slate-900 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                {savingGoals ? 'সংরক্ষণ...' : 'সংরক্ষণ'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 2. Add New Resource + Recorded Resource Inventory List (FR-06, FR-11) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form: Add Resource */}
        <section aria-labelledby="add-resource-heading" className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Plus className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <h2 id="add-resource-heading" className="text-base sm:text-lg font-bold text-slate-900">
              নতুন খামার সম্পদ যোগ করুন
            </h2>
          </div>

          <form onSubmit={handleAddResource} className="mt-4 space-y-4">
            <div>
              <label htmlFor="res-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
                সম্পদের ধরন <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <select
                id="res-type"
                name="resource_type"
                value={newResource.resource_type}
                onChange={(e) => handleResourceTypeChange(e.target.value)}
                className="w-full min-h-12 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
              >
                {RESOURCE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="res-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                সম্পদের নাম বা বিবরণ <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="res-name"
                name="resource_name"
                type="text"
                required
                aria-invalid={resErrors.resource_name ? 'true' : undefined}
                aria-describedby={resErrors.resource_name ? 'res-name-err' : undefined}
                value={newResource.resource_name}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewResource((p) => ({ ...p, resource_name: val }));
                  if (resErrors.resource_name) {
                    setResErrors((p) => ({ ...p, resource_name: validateResourceField('resource_name', val) }));
                  }
                }}
                onBlur={(e) => setResErrors((p) => ({ ...p, resource_name: validateResourceField('resource_name', e.target.value) }))}
                placeholder="যেমন: বাড়ির পুকুর / ২টি দুগ্ধবতী গাভী"
                className={`w-full min-h-12 px-3 py-2.5 bg-slate-50 border rounded-xl text-sm ${
                  resErrors.resource_name ? 'border-rose-400' : 'border-slate-200'
                }`}
              />
              {resErrors.resource_name && (
                <p id="res-name-err" className="text-xs text-rose-600 mt-1">{resErrors.resource_name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="res-qty" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  পরিমাণ <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="res-qty"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  aria-invalid={resErrors.quantity ? 'true' : undefined}
                  aria-describedby={resErrors.quantity ? 'res-qty-err' : undefined}
                  value={newResource.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewResource((p) => ({ ...p, quantity: val }));
                    if (resErrors.quantity) {
                      setResErrors((p) => ({ ...p, quantity: validateResourceField('quantity', val) }));
                    }
                  }}
                  onBlur={(e) => setResErrors((p) => ({ ...p, quantity: validateResourceField('quantity', e.target.value) }))}
                  placeholder="যেমন: ১০"
                  className={`w-full min-h-12 px-3 py-2.5 bg-slate-50 border rounded-xl text-sm ${
                    resErrors.quantity ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
                {resErrors.quantity && (
                  <p id="res-qty-err" className="text-xs text-rose-600 mt-1">{resErrors.quantity}</p>
                )}
              </div>

              <div>
                <label htmlFor="res-unit" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  একক <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="res-unit"
                  name="unit"
                  type="text"
                  required
                  value={newResource.unit}
                  onChange={(e) => setNewResource((p) => ({ ...p, unit: e.target.value }))}
                  placeholder="শতক / টি / কেজি"
                  className="w-full min-h-12 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="res-notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
                অতিরিক্ত নোট (ঐচ্ছিক)
              </label>
              <input
                id="res-notes"
                name="notes"
                type="text"
                value={newResource.notes}
                onChange={(e) => setNewResource((p) => ({ ...p, notes: e.target.value }))}
                placeholder="যেমন: সারা বছর পানি থাকে বা প্রতিদিন গোবর পাওয়া যায়"
                className="w-full min-h-12 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={addingResource}
              className="w-full min-h-12 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{addingResource ? 'যোগ করা হচ্ছে...' : 'সম্পদ তালিকায় যোগ করুন'}</span>
            </button>
          </form>
        </section>

        {/* Recorded Resource Inventory List */}
        <section aria-labelledby="resource-list-heading" className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 id="resource-list-heading" className="text-base sm:text-lg font-bold text-slate-900">
              নিবন্ধিত খামার সম্পদসমূহ ({resources.length} টি)
            </h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              সমন্বিত চাষে ব্যবহৃত হবে
            </span>
          </div>

          {resources.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-slate-500">
              <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">এখনো কোনো বিস্তারিত সম্পদ যোগ করা হয়নি।</p>
              <p className="text-xs">বাম পাশের ফরম থেকে পুকুর, গবাদিপশু, হাঁস-মুরগি বা খড়/কম্পোস্ট যোগ করুন।</p>
            </div>
          ) : (
            <div tabIndex={0} role="region" aria-label="নিবন্ধিত খামার সম্পদের তালিকা" className="mt-4 overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <caption className="visually-hidden">কৃষকের নিবন্ধিত খামার সম্পদসমূহ</caption>
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th scope="col" className="py-3 px-3 font-bold">সম্পদের নাম</th>
                    <th scope="col" className="py-3 px-3 font-bold">ধরন</th>
                    <th scope="col" className="py-3 px-3 font-bold">পরিমাণ</th>
                    <th scope="col" className="py-3 px-3 font-bold text-right">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.map((item) => {
                    const typeMeta = RESOURCE_TYPES.find((t) => t.value === item.resource_type) || RESOURCE_TYPES[0];
                    const IconComp = typeMeta.icon;
                    return (
                      <tr key={item.resource_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{item.resource_name}</div>
                          {item.notes && <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <IconComp className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                            <span>{typeMeta.label.split('(')[0].trim()}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-700">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteResource(item.resource_id)}
                            aria-label={`${item.resource_name} মুছে ফেলুন`}
                            className="inline-flex items-center justify-center min-w-10 min-h-10 p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

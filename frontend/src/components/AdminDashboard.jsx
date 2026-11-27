/**
 * agroWish Frontend - Admin Management Dashboard (ADMIN Role Only)
 * SRS Reference: FR-02 (RBAC), FR-25 (Crops/Varieties/Cost CRUD), FR-26 (Rules & Knowledge Base CRUD), FR-33 (Audit Logs)
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sprout,
  Recycle,
  BookOpen,
  ClipboardList,
  Users,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import AdminUserManagement from './AdminUserManagement';

export default function AdminDashboard() {
  const [subTab, setSubTab] = useState('crops'); // 'crops' | 'rules' | 'knowledge' | 'audit'
  const [stats, setStats] = useState(null);

  const [crops, setCrops] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [costItems, setCostItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [wasteRules, setWasteRules] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Forms State
  const [cropForm, setCropForm] = useState({
    editId: null, crop_name: '', bengali_name: '', season: 'Rabi', crop_category: 'Cereal',
    recommended_soil: 'দোআঁশ, পলি', water_requirement: 'মাঝারি', avg_cost_per_decimal: '', avg_revenue_per_decimal: ''
  });
  const [varietyForm, setVarietyForm] = useState({
    crop_id: '', variety_name: '', bengali_name: '', duration_days: '120', yield_per_decimal_kg: '20', pest_resistance_notes: ''
  });
  const [costForm, setCostForm] = useState({
    crop_id: '', item_name: '', item_category: 'seed', cost_min_per_decimal: '', cost_max_per_decimal: ''
  });
  const [comboForm, setComboForm] = useState({
    editId: null, combo_name: '', description: '', compatibility_rule: 'pond',
    est_cost_min: '5000', est_cost_max: '15000', est_return_min: '12000', est_return_max: '28000', risk_note: ''
  });
  const [wasteForm, setWasteForm] = useState({
    editId: null, source_activity: 'livestock', by_product: '', target_activity: '', usage_method: '', safety_note: ''
  });
  const [docForm, setDocForm] = useState({
    editId: null, title: '', source: '', category: 'সাধারণ কৃষি', keywords: '', content: ''
  });

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('agrowish_token')}`
  });

  const fetchAllAdminData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const h = { 'Authorization': `Bearer ${localStorage.getItem('agrowish_token')}` };
      const [sRes, cRes, vRes, ciRes, cbRes, wRes, kRes, aRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: h }),
        fetch('/api/admin/crops', { headers: h }),
        fetch('/api/admin/varieties', { headers: h }),
        fetch('/api/admin/cost-items', { headers: h }),
        fetch('/api/admin/integrated-combinations', { headers: h }),
        fetch('/api/admin/waste-rules', { headers: h }),
        fetch('/api/admin/knowledge', { headers: h }),
        fetch('/api/admin/audit-logs?limit=80', { headers: h })
      ]);

      if (sRes.status === 403 || cRes.status === 403) {
        throw new Error('অ্যাডমিন অনুমোদন ব্যর্থ হয়েছে (Forbidden)।');
      }

      const [sD, cD, vD, ciD, cbD, wD, kD, aD] = await Promise.all([
        sRes.json(), cRes.json(), vRes.json(), ciRes.json(), cbRes.json(), wRes.json(), kRes.json(), aRes.json()
      ]);

      setStats(sD.stats || null);
      setCrops(cD.crops || []);
      setVarieties(vD.varieties || []);
      setCostItems(ciD.cost_items || []);
      setCombos(cbD.combinations || []);
      setWasteRules(wD.waste_rules || []);
      setDocuments(kD.documents || []);
      setAuditLogs(aD.audit_logs || []);

      if (cD.crops?.length > 0) {
        setVarietyForm((p) => ({ ...p, crop_id: p.crop_id || String(cD.crops[0].crop_id) }));
        setCostForm((p) => ({ ...p, crop_id: p.crop_id || String(cD.crops[0].crop_id) }));
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const notifySuccess = (msg) => {
    setErrorMsg('');
    setStatusMsg(msg);
    fetchAllAdminData();
  };

  // --- Crop Submit ---
  const handleCropSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(''); setErrorMsg('');
    const isEdit = Boolean(cropForm.editId);
    const url = isEdit ? `/api/admin/crops/${cropForm.editId}` : '/api/admin/crops';
    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(cropForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setCropForm({ editId: null, crop_name: '', bengali_name: '', season: 'Rabi', crop_category: 'Cereal', recommended_soil: 'দোআঁশ, পলি', water_requirement: 'মাঝারি', avg_cost_per_decimal: '', avg_revenue_per_decimal: '' });
      notifySuccess(data.message);
    } catch (err) { setErrorMsg(err.message); }
  };

  const handleVarietySubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(''); setErrorMsg('');
    try {
      const res = await fetch('/api/admin/varieties', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(varietyForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setVarietyForm((p) => ({ ...p, variety_name: '', bengali_name: '', pest_resistance_notes: '' }));
      notifySuccess(data.message);
    } catch (err) { setErrorMsg(err.message); }
  };

  const handleCostSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(''); setErrorMsg('');
    try {
      const res = await fetch('/api/admin/cost-items', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(costForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setCostForm((p) => ({ ...p, item_name: '', cost_min_per_decimal: '', cost_max_per_decimal: '' }));
      notifySuccess(data.message);
    } catch (err) { setErrorMsg(err.message); }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(''); setErrorMsg('');
    const isEdit = Boolean(comboForm.editId);
    const url = isEdit ? `/api/admin/integrated-combinations/${comboForm.editId}` : '/api/admin/integrated-combinations';
    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(comboForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setComboForm({ editId: null, combo_name: '', description: '', compatibility_rule: 'pond', est_cost_min: '5000', est_cost_max: '15000', est_return_min: '12000', est_return_max: '28000', risk_note: '' });
      notifySuccess(data.message);
    } catch (err) { setErrorMsg(err.message); }
  };

  const handleWasteSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(''); setErrorMsg('');
    const isEdit = Boolean(wasteForm.editId);
    const url = isEdit ? `/api/admin/waste-rules/${wasteForm.editId}` : '/api/admin/waste-rules';
    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(wasteForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setWasteForm({ editId: null, source_activity: 'livestock', by_product: '', target_activity: '', usage_method: '', safety_note: '' });
      notifySuccess(data.message);
    } catch (err) { setErrorMsg(err.message); }
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(''); setErrorMsg('');
    const isEdit = Boolean(docForm.editId);
    const url = isEdit ? `/api/admin/knowledge/${docForm.editId}` : '/api/admin/knowledge';
    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(docForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setDocForm({ editId: null, title: '', source: '', category: 'সাধারণ কৃষি', keywords: '', content: '' });
      notifySuccess(data.message);
    } catch (err) { setErrorMsg(err.message); }
  };

  const handleDelete = async (endpoint) => {
    setStatusMsg(''); setErrorMsg('');
    try {
      const res = await fetch(endpoint, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      notifySuccess(data.message);
    } catch (err) { setErrorMsg(err.message); }
  };

  const adminTabs = [
    { id: 'crops', label: 'ফসল, জাত ও খরচ', icon: Sprout },
    { id: 'rules', label: 'সমন্বিত চাষ ও বর্জ্য বিধি', icon: Recycle },
    { id: 'knowledge', label: 'কৃষি তথ্যভাণ্ডার', icon: BookOpen },
    { id: 'audit', label: `অডিট লগ (${auditLogs.length})`, icon: ClipboardList },
    { id: 'users', label: 'ব্যবহারকারী ব্যবস্থাপনা', icon: Users }
  ];

  const handleTabKeyDown = (e, idx) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSubTab(adminTabs[(idx + 1) % adminTabs.length].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSubTab(adminTabs[(idx - 1 + adminTabs.length) % adminTabs.length].id);
    }
  };

  if (loading && !stats) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-600">অ্যাডমিন প্যানেল লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Overview Stats */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700 text-white rounded-xl">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                অ্যাডমিন কন্ট্রোল প্যানেল ও তথ্য ব্যবস্থাপনা
              </h2>
              <p className="text-xs text-slate-500">
                প্রতিটি পরিবর্তন স্বয়ংক্রিয়ভাবে অডিট লগে (audit_logs) সংরক্ষিত হয়।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchAllAdminData}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>সকল তথ্য রিফ্রেশ</span>
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200"><div className="text-lg font-black text-slate-800">{stats.users}</div><div className="text-[11px] text-slate-500">মোট ব্যবহারকারী</div></div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200"><div className="text-lg font-black text-emerald-700">{stats.crops} / {stats.varieties}</div><div className="text-[11px] text-emerald-800">ফসল / জাত</div></div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200"><div className="text-lg font-black text-slate-800">{stats.cost_items}</div><div className="text-[11px] text-slate-500">খরচের খাত</div></div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200"><div className="text-lg font-black text-slate-800">{stats.integrated_combinations + stats.waste_rules}</div><div className="text-[11px] text-slate-500">সমন্বিত ও বর্জ্য বিধি</div></div>
            <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200"><div className="text-lg font-black text-teal-700">{stats.knowledge_documents}</div><div className="text-[11px] text-teal-800">কৃষি নথি</div></div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200"><div className="text-lg font-black text-slate-800">{stats.audit_logs}</div><div className="text-[11px] text-slate-500">অডিট রেকর্ড</div></div>
          </div>
        )}

        {/* Accessible Tablist */}
        <div role="tablist" aria-label="অ্যাডমিন ব্যবস্থাপনা বিভাগসমূহ" className="nav-scroll gap-1 border-b border-slate-200">
          {adminTabs.map((t, idx) => {
            const IconComp = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`admin-tab-${t.id}`}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setSubTab(t.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`flex-none inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer border-b-3 transition-colors ${
                  active ? 'text-emerald-800 border-emerald-600' : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <IconComp className="w-4 h-4" aria-hidden="true" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {statusMsg && (
        <div role="status" aria-live="polite" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs sm:text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ================= TAB 1: CROPS, VARIETIES & COST ITEMS ================= */}
      {subTab === 'crops' && (
        <div role="tabpanel" aria-labelledby="admin-tab-crops" className="space-y-6">
          {/* Add/Edit Crop Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {cropForm.editId ? `ফসল সম্পাদনা (#${cropForm.editId})` : 'নতুন ফসল যোগ করুন'}
              </h3>
              {cropForm.editId && (
                <button type="button" onClick={() => setCropForm({ editId: null, crop_name: '', bengali_name: '', season: 'Rabi', crop_category: 'Cereal', recommended_soil: 'দোআঁশ, পলি', water_requirement: 'মাঝারি', avg_cost_per_decimal: '', avg_revenue_per_decimal: '' })} className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer">
                  <X className="w-4 h-4" /> বাতিল
                </button>
              )}
            </div>
            <form onSubmit={handleCropSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label htmlFor="adm-cname" className="block text-xs font-semibold mb-1">ইংরেজি নাম *</label>
                <input id="adm-cname" required value={cropForm.crop_name} onChange={(e) => setCropForm((p) => ({ ...p, crop_name: e.target.value }))} placeholder="e.g. Lentil" className="w-full min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div>
                <label htmlFor="adm-cbn" className="block text-xs font-semibold mb-1">বাংলা নাম *</label>
                <input id="adm-cbn" required value={cropForm.bengali_name} onChange={(e) => setCropForm((p) => ({ ...p, bengali_name: e.target.value }))} placeholder="যেমন: মসুর ডাল" className="w-full min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div>
                <label htmlFor="adm-cseason" className="block text-xs font-semibold mb-1">মৌসুম *</label>
                <select id="adm-cseason" value={cropForm.season} onChange={(e) => setCropForm((p) => ({ ...p, season: e.target.value }))} className="w-full min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <option value="Rabi">Rabi (রবি)</option>
                  <option value="Kharif-1">Kharif-1 (খরিপ-১)</option>
                  <option value="Kharif-2">Kharif-2 (খরিপ-২)</option>
                  <option value="Year-round">Year-round</option>
                </select>
              </div>
              <div>
                <label htmlFor="adm-csoil" className="block text-xs font-semibold mb-1">উপযোগী মাটি *</label>
                <input id="adm-csoil" required value={cropForm.recommended_soil} onChange={(e) => setCropForm((p) => ({ ...p, recommended_soil: e.target.value }))} className="w-full min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div>
                <label htmlFor="adm-cwater" className="block text-xs font-semibold mb-1">পানির চাহিদা *</label>
                <input id="adm-cwater" required value={cropForm.water_requirement} onChange={(e) => setCropForm((p) => ({ ...p, water_requirement: e.target.value }))} className="w-full min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div>
                <label htmlFor="adm-ccost" className="block text-xs font-semibold mb-1">গড় খরচ/শতক (৳) *</label>
                <input id="adm-ccost" type="number" min="0" required value={cropForm.avg_cost_per_decimal} onChange={(e) => setCropForm((p) => ({ ...p, avg_cost_per_decimal: e.target.value }))} className="w-full min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div>
                <label htmlFor="adm-crev" className="block text-xs font-semibold mb-1">গড় আয়/শতক (৳) *</label>
                <input id="adm-crev" type="number" min="0" required value={cropForm.avg_revenue_per_decimal} onChange={(e) => setCropForm((p) => ({ ...p, avg_revenue_per_decimal: e.target.value }))} className="w-full min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>{cropForm.editId ? 'হালনাগাদ করুন' : 'ফসল সংরক্ষণ'}</span>
                </button>
              </div>
            </form>

            {/* Crops Table */}
            <div tabIndex={0} role="region" aria-label="ফসলের তালিকা" className="overflow-x-auto max-h-[320px] pt-2">
              <table className="w-full text-left border-collapse text-xs">
                <caption className="visually-hidden">মাস্টার ফসল তালিকা</caption>
                <thead className="sticky top-0 bg-slate-100 text-slate-700">
                  <tr>
                    <th scope="col" className="p-2.5">আইডি</th>
                    <th scope="col" className="p-2.5">ফসলের নাম</th>
                    <th scope="col" className="p-2.5">মৌসুম</th>
                    <th scope="col" className="p-2.5">খরচ/শতক</th>
                    <th scope="col" className="p-2.5">আয়/শতক</th>
                    <th scope="col" className="p-2.5 text-right">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {crops.map((c) => (
                    <tr key={c.crop_id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold">#{c.crop_id}</td>
                      <td className="p-2.5 font-bold text-slate-800">{c.bengali_name} ({c.crop_name})</td>
                      <td className="p-2.5">{c.season}</td>
                      <td className="p-2.5">৳{c.avg_cost_per_decimal}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">৳{c.avg_revenue_per_decimal}</td>
                      <td className="p-2.5 text-right space-x-1">
                        <button type="button" aria-label={`${c.crop_name} সম্পাদনা`} onClick={() => setCropForm({ editId: c.crop_id, ...c })} className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer">
                          <Edit3 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={`${c.crop_name} মুছুন`} onClick={() => handleDelete(`/api/admin/crops/${c.crop_id}`)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Varieties + Cost Items Quick Add */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">নতুন জাত ও ব্যয়ের উপকরণ যোগ করুন</h3>
              <form onSubmit={handleVarietySubmit} className="space-y-2.5 pb-4 border-b border-slate-100">
                <div className="text-xs font-bold text-emerald-800">জাত (Crop Variety) যোগ:</div>
                <div className="grid grid-cols-2 gap-2">
                  <select aria-label="জাতের জন্য ফসল" value={varietyForm.crop_id} onChange={(e) => setVarietyForm((p) => ({ ...p, crop_id: e.target.value }))} className="min-h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    {crops.map((c) => <option key={c.crop_id} value={c.crop_id}>{c.bengali_name}</option>)}
                  </select>
                  <input aria-label="জাতের ইংরেজি নাম" required placeholder="Variety (e.g. BRRI dhan92)" value={varietyForm.variety_name} onChange={(e) => setVarietyForm((p) => ({ ...p, variety_name: e.target.value }))} className="min-h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  <input aria-label="জাতের বাংলা নাম" placeholder="বাংলা নাম" value={varietyForm.bengali_name} onChange={(e) => setVarietyForm((p) => ({ ...p, bengali_name: e.target.value }))} className="min-h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  <input aria-label="ফলন কেজি প্রতি শতক" type="number" step="0.1" required placeholder="ফলন (কেজি/শতক)" value={varietyForm.yield_per_decimal_kg} onChange={(e) => setVarietyForm((p) => ({ ...p, yield_per_decimal_kg: e.target.value }))} className="min-h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <button type="submit" className="px-4 py-2 min-h-10 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer">জাত যুক্ত করুন</button>
              </form>

              <form onSubmit={handleCostSubmit} className="space-y-2.5">
                <div className="text-xs font-bold text-teal-800">খরচের উপকরণ (Cost Item) যোগ:</div>
                <div className="grid grid-cols-2 gap-2">
                  <select aria-label="খরচের জন্য ফসল" value={costForm.crop_id} onChange={(e) => setCostForm((p) => ({ ...p, crop_id: e.target.value }))} className="min-h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    {crops.map((c) => <option key={c.crop_id} value={c.crop_id}>{c.bengali_name}</option>)}
                  </select>
                  <select aria-label="খরচের ধরন" value={costForm.item_category} onChange={(e) => setCostForm((p) => ({ ...p, item_category: e.target.value }))} className="min-h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <option value="seed">বীজ (seed)</option>
                    <option value="fertilizer">সার (fertilizer)</option>
                    <option value="irrigation">সেচ (irrigation)</option>
                    <option value="labor">শ্রমিক (labor)</option>
                    <option value="pesticide">বালাইনাশক (pesticide)</option>
                  </select>
                  <input aria-label="উপকরণের নাম" required placeholder="উপকরণের নাম" value={costForm.item_name} onChange={(e) => setCostForm((p) => ({ ...p, item_name: e.target.value }))} className="col-span-2 min-h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  <input aria-label="সর্বনিম্ন ব্যয়" type="number" required placeholder="সর্বনিম্ন ব্যয় (৳/শতক)" value={costForm.cost_min_per_decimal} onChange={(e) => setCostForm((p) => ({ ...p, cost_min_per_decimal: e.target.value }))} className="min-h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  <input aria-label="সর্বোচ্চ ব্যয়" type="number" required placeholder="সর্বোচ্চ ব্যয় (৳/শতক)" value={costForm.cost_max_per_decimal} onChange={(e) => setCostForm((p) => ({ ...p, cost_max_per_decimal: e.target.value }))} className="min-h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <button type="submit" className="px-4 py-2 min-h-10 bg-teal-600 text-white rounded-xl text-xs font-bold cursor-pointer">খরচের খাত যুক্ত করুন</button>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">নিবন্ধিত জাত ({varieties.length}) ও খরচের উপকরণ ({costItems.length})</h3>
              <div tabIndex={0} role="region" aria-label="জাতের তালিকা" className="overflow-y-auto max-h-[300px] space-y-2 text-xs">
                {varieties.map((v) => (
                  <div key={v.variety_id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{v.bengali_name || v.variety_name}</span>
                      <span className="text-slate-500 ml-2">({v.crop_bengali_name} • {v.yield_per_decimal_kg} কেজি/শতক)</span>
                    </div>
                    <button type="button" aria-label={`${v.variety_name} মুছুন`} onClick={() => handleDelete(`/api/admin/varieties/${v.variety_id}`)} className="text-rose-600 p-1 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: INTEGRATED & WASTE-TO-VALUE RULES ================= */}
      {subTab === 'rules' && (
        <div role="tabpanel" aria-labelledby="admin-tab-rules" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Integrated Combinations */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 space-y-4">
            <h3 className="text-base font-bold text-slate-900">সমন্বিত খামার বিধি ({combos.length})</h3>
            <form onSubmit={handleComboSubmit} className="space-y-2.5 pb-4 border-b border-slate-100 text-xs">
              <input aria-label="সমন্বিত চাষের নাম" required placeholder="সমন্বিত চাষের নাম" value={comboForm.combo_name} onChange={(e) => setComboForm((p) => ({ ...p, combo_name: e.target.value }))} className="w-full min-h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl" />
              <input aria-label="প্রয়োজনীয় সম্পদ বিধি" required placeholder="সামঞ্জস্য বিধি (যেমন: pond,poultry)" value={comboForm.compatibility_rule} onChange={(e) => setComboForm((p) => ({ ...p, compatibility_rule: e.target.value }))} className="w-full min-h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl" />
              <textarea aria-label="সমন্বিত চাষের বিবরণ" required rows={2} placeholder="বিস্তারিত বিবরণ" value={comboForm.description} onChange={(e) => setComboForm((p) => ({ ...p, description: e.target.value }))} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              <textarea aria-label="ঝুঁকি ও সতর্কতা নোট" required rows={2} placeholder="ঝুঁকি ও বিশেষজ্ঞ সতর্কতা নোট" value={comboForm.risk_note} onChange={(e) => setComboForm((p) => ({ ...p, risk_note: e.target.value }))} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              <button type="submit" className="px-4 py-2 min-h-10 bg-emerald-600 text-white font-bold rounded-xl cursor-pointer">
                {comboForm.editId ? 'সমন্বিত বিধি হালনাগাদ' : 'সমন্বিত বিধি যোগ করুন'}
              </button>
            </form>
            <div className="space-y-2 max-h-[300px] overflow-y-auto text-xs">
              {combos.map((c) => (
                <div key={c.combo_id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800">{c.combo_name}</div>
                    <div className="text-[11px] text-teal-700">Rule: {c.compatibility_rule}</div>
                  </div>
                  <button type="button" aria-label={`${c.combo_name} মুছুন`} onClick={() => handleDelete(`/api/admin/integrated-combinations/${c.combo_id}`)} className="text-rose-600 p-1 cursor-pointer">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Waste-to-Value Rules */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 space-y-4">
            <h3 className="text-base font-bold text-slate-900">বর্জ্য-থেকে-সম্পদ বিধি ({wasteRules.length})</h3>
            <form onSubmit={handleWasteSubmit} className="space-y-2.5 pb-4 border-b border-slate-100 text-xs">
              <select aria-label="উৎস কার্যক্রম" value={wasteForm.source_activity} onChange={(e) => setWasteForm((p) => ({ ...p, source_activity: e.target.value }))} className="w-full min-h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                <option value="livestock">গবাদিপশু (livestock)</option>
                <option value="poultry">হাঁস-মুরগি (poultry)</option>
                <option value="crop_residue">ফসলের উচ্ছিষ্ট (crop_residue)</option>
                <option value="organic_material">জৈব বর্জ্য (organic_material)</option>
                <option value="pond">পুকুর (pond)</option>
              </select>
              <input aria-label="উপজাত বর্জ্য" required placeholder="উপজাত (যেমন: গবাদিপশুর গোবর)" value={wasteForm.by_product} onChange={(e) => setWasteForm((p) => ({ ...p, by_product: e.target.value }))} className="w-full min-h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl" />
              <input aria-label="লক্ষ্য পণ্য বা কার্যক্রম" required placeholder="লক্ষ্য পণ্য (যেমন: কেঁচো সার)" value={wasteForm.target_activity} onChange={(e) => setWasteForm((p) => ({ ...p, target_activity: e.target.value }))} className="w-full min-h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl" />
              <textarea aria-label="ব্যবহার পদ্ধতি" required rows={2} placeholder="প্রক্রিয়াজাতকরণ ও ব্যবহার পদ্ধতি" value={wasteForm.usage_method} onChange={(e) => setWasteForm((p) => ({ ...p, usage_method: e.target.value }))} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              <textarea aria-label="নিরাপত্তা সতর্কতা" required rows={2} placeholder="বাধ্যতামূলক নিরাপত্তা সতর্কতা (safety_note)" value={wasteForm.safety_note} onChange={(e) => setWasteForm((p) => ({ ...p, safety_note: e.target.value }))} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              <button type="submit" className="px-4 py-2 min-h-10 bg-teal-600 text-white font-bold rounded-xl cursor-pointer">
                {wasteForm.editId ? 'বর্জ্য বিধি হালনাগাদ' : 'বর্জ্য বিধি যোগ করুন'}
              </button>
            </form>
            <div className="space-y-2 max-h-[300px] overflow-y-auto text-xs">
              {wasteRules.map((r) => (
                <div key={r.rule_id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800">{r.by_product} → {r.target_activity}</div>
                    <div className="text-[11px] text-rose-700 mt-0.5">{r.safety_note}</div>
                  </div>
                  <button type="button" aria-label={`${r.by_product} বিধি মুছুন`} onClick={() => handleDelete(`/api/admin/waste-rules/${r.rule_id}`)} className="text-rose-600 p-1 cursor-pointer">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: KNOWLEDGE BASE DOCUMENTS ================= */}
      {subTab === 'knowledge' && (
        <div role="tabpanel" aria-labelledby="admin-tab-knowledge" className="bg-white rounded-3xl p-6 border border-slate-200/80 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              {docForm.editId ? `নথি সম্পাদনা (#${docForm.editId})` : `কৃষি তথ্যভাণ্ডার ব্যবস্থাপনা (${documents.length} টি নথি)`}
            </h3>
            {docForm.editId && (
              <button type="button" onClick={() => setDocForm({ editId: null, title: '', source: '', category: 'সাধারণ কৃষি', keywords: '', content: '' })} className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer">
                <X className="w-4 h-4" /> বাতিল
              </button>
            )}
          </div>

          <form onSubmit={handleDocSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pb-4 border-b border-slate-100">
            <input aria-label="নথির শিরোনাম" required placeholder="নথির শিরোনাম *" value={docForm.title} onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))} className="min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl" />
            <input aria-label="তথ্যসূত্র সংস্থা" required placeholder="তথ্যসূত্র (যেমন: BARI / BRRI / DAE) *" value={docForm.source} onChange={(e) => setDocForm((p) => ({ ...p, source: e.target.value }))} className="min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl" />
            <input aria-label="বিভাগ" placeholder="বিভাগ (যেমন: ফসল সুরক্ষা)" value={docForm.category} onChange={(e) => setDocForm((p) => ({ ...p, category: e.target.value }))} className="min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl" />
            <input aria-label="কীওয়ার্ডসমূহ" placeholder="অনুসন্ধান কীওয়ার্ড (বাংলা/ইংরেজি)" value={docForm.keywords} onChange={(e) => setDocForm((p) => ({ ...p, keywords: e.target.value }))} className="min-h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl" />
            <textarea aria-label="মূল বিষয়বস্তু" required rows={3} placeholder="যাচাইকৃত কৃষি পরামর্শের মূল বিবরণ *" value={docForm.content} onChange={(e) => setDocForm((p) => ({ ...p, content: e.target.value }))} className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl" />
            <div>
              <button type="submit" className="px-6 py-2.5 min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">
                {docForm.editId ? 'নথি হালনাগাদ করুন' : 'নথি সংরক্ষণ করুন'}
              </button>
            </div>
          </form>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto text-xs">
            {documents.map((doc) => (
              <div key={doc.doc_id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">{doc.title}</div>
                  <div className="text-[11px] font-semibold text-emerald-700">উৎস: {doc.source} • বিভাগ: {doc.category}</div>
                  <p className="text-slate-600 line-clamp-2">{doc.content}</p>
                </div>
                <div className="flex items-center gap-1 flex-none">
                  <button type="button" aria-label={`${doc.title} সম্পাদনা`} onClick={() => setDocForm({ editId: doc.doc_id, ...doc })} className="p-2 text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer">
                    <Edit3 className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`${doc.title} মুছুন`} onClick={() => handleDelete(`/api/admin/knowledge/${doc.doc_id}`)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: AUDIT LOGS (FR-33) ================= */}
      {subTab === 'audit' && (
        <div role="tabpanel" aria-labelledby="admin-tab-audit" className="bg-white rounded-3xl p-6 border border-slate-200/80 space-y-4">
          <h3 className="text-base font-bold text-slate-900">সিস্টেম অডিট লগ (System Audit Trail)</h3>
          <div tabIndex={0} role="region" aria-label="সিস্টেম অডিট লগ টেবিল" className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left border-collapse text-xs">
              <caption className="visually-hidden">অ্যাডমিন ও সিস্টেম কার্যক্রমের অডিট লগ</caption>
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th scope="col" className="p-3">লগ আইডি</th>
                  <th scope="col" className="p-3">কার্যক্রম (Action)</th>
                  <th scope="col" className="p-3">লক্ষ্য (Target)</th>
                  <th scope="col" className="p-3">ব্যবহারকারী</th>
                  <th scope="col" className="p-3">সময়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">#{log.log_id}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-700">{log.target || '-'}</td>
                    <td className="p-3">{log.full_name || `User #${log.user_id || '-'}`} ({log.role || '-'})</td>
                    <td className="p-3 text-slate-500">{new Date(log.logged_at).toLocaleString('bn-BD')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: USER MANAGEMENT ================= */}
      {subTab === 'users' && (
        <AdminUserManagement />
      )}
    </div>
  );
}

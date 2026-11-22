/**
 * agroWish Frontend - Enhanced Recommendation, Comparison, Integrated Farming & Feedback View
 * SRS Reference: FR-08..FR-16, FR-17, FR-21, FR-22, FR-23, FR-24, FR-30, FR-32, FR-35
 */

import React, { useState, useEffect } from 'react';
import {
  Sprout,
  TrendingUp,
  Clock,
  Wallet,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Check,
  Recycle,
  Waves,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react';

export default function RecommendationList({ onNavigateToProfile, onNavigateToResources }) {
  const [recommendationId, setRecommendationId] = useState(null);
  const [cropOptions, setCropOptions] = useState([]);
  const [integratedOptions, setIntegratedOptions] = useState([]);
  const [wasteOptions, setWasteOptions] = useState([]);
  const [farmerSummary, setFarmerSummary] = useState(null);
  const [explanationBn, setExplanationBn] = useState('');
  const [uncertaintyNote, setUncertaintyNote] = useState('');
  const [expertNotice, setExpertNotice] = useState('');
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState('');

  const [viewMode, setViewMode] = useState('all'); // 'all' | 'crops' | 'integrated' | 'waste'
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedCostId, setExpandedCostId] = useState(null);
  const [selectedCropId, setSelectedCropId] = useState(null);
  const [selectionNotice, setSelectionNotice] = useState('');

  // Feedback Widget State (FR-32)
  const [feedbackHelpful, setFeedbackHelpful] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const generateRecommendations = async () => {
    const token = localStorage.getItem('agrowish_token');
    if (!token) {
      setErrorMessage('অনুগ্রহ করে লগইন করুন।');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setFeedbackHelpful(null);
    setFeedbackComment('');
    setFeedbackMessage('');

    try {
      const res = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 400) {
          setErrorMessage(data.message || 'প্রথমে আপনার খামারের তথ্য ও জমির পরিমাপ সম্পূর্ণ করুন।');
        } else {
          throw new Error(data.message || 'সুপারিশ তৈরি করতে ব্যর্থ হয়েছে।');
        }
        setCropOptions([]);
        return;
      }

      setRecommendationId(data.recommendation_id || null);
      setCropOptions(data.crop_options || data.recommendations || []);
      setIntegratedOptions(data.integrated_options || []);
      setWasteOptions(data.waste_to_value_options || []);
      setFarmerSummary(data.farmer_summary || null);
      setExplanationBn(data.explanation_bn || '');
      setUncertaintyNote(data.uncertainty_note || '');
      setExpertNotice(data.expert_verification_notice || '');
      setIsFallback(Boolean(data.is_fallback));
      setFallbackReason(data.fallback_reason || '');

      const savedSelection = localStorage.getItem('agrowish_selected_crop');
      if (savedSelection) {
        setSelectedCropId(parseInt(savedSelection, 10));
      }
    } catch (err) {
      console.error('[RecommendationList Error]', err);
      setErrorMessage(err.message || 'সার্ভার সংযোগে ত্রুটি দেখা দিয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateRecommendations();
  }, []);

  const toggleCostAccordion = (cropId) => {
    setExpandedCostId((prev) => (prev === cropId ? null : cropId));
  };

  const handleSelectCrop = (crop) => {
    setSelectedCropId(crop.crop_id);
    localStorage.setItem('agrowish_selected_crop', String(crop.crop_id));
    setSelectionNotice(`অভিনন্দন! আপনি আপনার খামারের জন্য "${crop.bengali_name}" সফলভাবে নির্বাচন করেছেন।`);
    setTimeout(() => setSelectionNotice(''), 4500);
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!recommendationId || feedbackHelpful === null) return;

    const token = localStorage.getItem('agrowish_token');
    setFeedbackSubmitting(true);
    setFeedbackMessage('');
    try {
      const res = await fetch(`/api/recommendations/${recommendationId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_helpful: feedbackHelpful,
          rating: feedbackHelpful ? 5 : 2,
          comment: feedbackComment
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'মতামত সংরক্ষণ হয়নি।');
      setFeedbackMessage(data.message || 'আপনার মতামত সংরক্ষিত হয়েছে!');
    } catch (err) {
      setFeedbackMessage(err.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const subTabs = [
    { id: 'all', label: 'সকল তুলনামূলক ফলাফল' },
    { id: 'crops', label: `ফসল ও জাত (${cropOptions.length})` },
    { id: 'integrated', label: `সমন্বিত চাষ (${integratedOptions.length})` },
    { id: 'waste', label: `বর্জ্য থেকে সম্পদ (${wasteOptions.length})` }
  ];

  const handleTabKeyDown = (e, idx) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setViewMode(subTabs[(idx + 1) % subTabs.length].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setViewMode(subTabs[(idx - 1 + subTabs.length) % subTabs.length].id);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="font-bold text-slate-800 text-base">তুলনামূলক ফসল, সমন্বিত চাষ ও বর্জ্য-থেকে-সম্পদ পরিকল্পনা তৈরি হচ্ছে...</h3>
        <p className="text-xs text-slate-500 mt-1">বাজেট, মাটি, খামারের সম্পদ ও বাজারদরের পরিসর বিশ্লেষণ করা হচ্ছে</p>
      </div>
    );
  }

  if (errorMessage && cropOptions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xs text-center space-y-4">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">খামারের তথ্য অসম্পূর্ণ</h3>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">{errorMessage}</p>
        <button
          type="button"
          onClick={onNavigateToProfile}
          className="inline-flex items-center gap-2 px-6 py-3 min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md cursor-pointer text-xs sm:text-sm"
        >
          <Layers className="w-4 h-4" aria-hidden="true" />
          <span>খামারের তথ্য ফর্মে যান</span>
        </button>
      </div>
    );
  }

  const showCrops = viewMode === 'all' || viewMode === 'crops';
  const showIntegrated = viewMode === 'all' || viewMode === 'integrated';
  const showWaste = viewMode === 'all' || viewMode === 'waste';

  return (
    <div className="space-y-6">
      {/* Header & Summary Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Sparkles className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                তুলনামূলক ফলাফল, সমন্বিত চাষ ও ব্যয়-আয় বিশ্লেষণ
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {recommendationId ? `সংরক্ষিত সুপারিশ #${recommendationId} • ` : ''}
              আপনার বাজেট ও খামার সম্পদ অনুযায়ী একাধিক তুলনামূলক বিকল্প
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToResources && (
              <button
                type="button"
                onClick={onNavigateToResources}
                className="px-3.5 py-2 min-h-11 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl cursor-pointer"
              >
                সম্পদ পরিবর্তন করুন
              </button>
            )}
            <button
              type="button"
              onClick={generateRecommendations}
              className="flex items-center gap-1.5 px-4 py-2 min-h-11 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>পুনরায় হিসাব করুন</span>
            </button>
          </div>
        </div>

        {/* Farmer Condition Strip */}
        {farmerSummary && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <span className="font-bold">খামার সারাংশ:</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">জেলা: {farmerSummary.district}</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">জমি: {farmerSummary.land_size} শতক</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">মাটি: {farmerSummary.soil_type}</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">মৌসুম: {farmerSummary.season}</span>
            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
              বাজেট: ৳{Number(farmerSummary.budget || 0).toLocaleString('bn-BD')}
            </span>
          </div>
        )}

        {explanationBn && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs sm:text-sm text-emerald-950 leading-relaxed">
            <strong>বিশ্লেষণ সারাংশ:</strong> {explanationBn}
          </div>
        )}

        {/* Sub-Tabs (Single-row accessible tablist with underline indicator) */}
        <div role="tablist" aria-label="সুপারিশ বিভাগসমূহ" className="nav-scroll gap-1 border-b border-slate-200 pt-1">
          {subTabs.map((t, idx) => {
            const active = viewMode === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`rec-tab-${t.id}`}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setViewMode(t.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`flex-none px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer border-b-3 transition-colors ${
                  active
                    ? 'text-emerald-800 border-emerald-600'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fallback Banner (FR-35) */}
      {isFallback && (
        <div role="status" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm">
            <div className="font-bold">বিকল্প সুপারিশ অ্যালগরিদম সক্রিয় (Fallback Active)</div>
            <p className="mt-0.5 text-amber-800">{fallbackReason}</p>
          </div>
        </div>
      )}

      {selectionNotice && (
        <div role="status" aria-live="polite" className="p-4 rounded-2xl bg-emerald-600 text-white flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-semibold">{selectionNotice}</span>
        </div>
      )}

      {/* ================= 1. CROP & VARIETY COMPARISON CARDS ================= */}
      {showCrops && (
        <section aria-labelledby="rec-tab-crops" className="space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <span>১. ফসল ও অনুমোদিত জাতের তুলনামূলক বিকল্পসমূহ</span>
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {cropOptions.map((crop, index) => {
              const isSelected = selectedCropId === crop.crop_id;
              const isExpanded = expandedCostId === crop.crop_id;

              return (
                <div
                  key={crop.crop_id}
                  className={`rounded-3xl border bg-white shadow-xs overflow-hidden transition-all ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/90'
                  }`}
                >
                  <div className="p-5 sm:p-6 pb-4 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            বিকল্প #{index + 1}
                          </span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            উপযোগিতা: {Math.round(crop.confidence_score || 80)}%
                          </span>
                          {crop.expert_verification_needed && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                              বিশেষজ্ঞের পরামর্শ আবশ্যক
                            </span>
                          )}
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mt-2">
                          {crop.bengali_name} ({crop.crop_name})
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">{crop.crop_category}</p>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                          {crop.season}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {crop.duration_days || 120} দিন
                        </span>
                      </div>
                    </div>

                    {crop.synergy_badges && crop.synergy_badges.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {crop.synergy_badges.map((badge, bIdx) => (
                          <span
                            key={bIdx}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg"
                          >
                            {badge.type === 'ORGANIC_SAVINGS' ? (
                              <Recycle className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                            ) : (
                              <Waves className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                            )}
                            {badge.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cost vs Potential Return Comparison (FR-15) */}
                  <div className="p-5 sm:p-6 pt-4 bg-slate-50/50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-2xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 block">আনুমানিক ব্যয়ের পরিসর</span>
                        <div className="text-sm sm:text-base font-black text-slate-800 mt-1">
                          ৳{Number(crop.est_cost_min || crop.total_estimated_cost).toLocaleString('bn-BD')} – ৳{Number(crop.est_cost_max || crop.total_estimated_cost).toLocaleString('bn-BD')}
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 block">সম্ভাব্য আয়ের পরিসর</span>
                        <div className="text-sm sm:text-base font-black text-slate-800 mt-1">
                          ৳{Number(crop.est_return_min || crop.total_gross_return).toLocaleString('bn-BD')} – ৳{Number(crop.est_return_max || crop.total_gross_return).toLocaleString('bn-BD')}
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                        <span className="text-[11px] font-bold text-emerald-800 block">গড় নিট লাভ ও ROI</span>
                        <div className="text-sm sm:text-base font-black text-emerald-700 mt-1">
                          ৳{Number(crop.projected_net_profit || 0).toLocaleString('bn-BD')}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-bold">
                          <TrendingUp className="w-3 h-3" aria-hidden="true" />
                          <span>ROI: +{crop.profit_margin_roi}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Assumptions & Reason */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-600 space-y-1">
                      {crop.reason && <div><strong className="text-slate-800">কারণ:</strong> {crop.reason}</div>}
                      {crop.assumptions && <div><strong className="text-slate-800">অনুমানসমূহ:</strong> {crop.assumptions}</div>}
                    </div>

                    {/* Varieties */}
                    {crop.varieties && crop.varieties.length > 0 && (
                      <div className="text-xs">
                        <span className="font-semibold text-slate-700">অনুমোদিত সার্টিফাইড জাত:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {crop.varieties.map((v, vIdx) => (
                            <span key={vIdx} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px]">
                              {v.name_bn || v.name} {v.yield_kg ? `(${v.yield_kg})` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cost Breakdown Accordion */}
                    <div>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => toggleCostAccordion(crop.crop_id)}
                        className="w-full min-h-11 flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                          <span>বিস্তারিত খরচ বিবরণ (Itemized Cost Breakdown)</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                      </button>

                      {isExpanded && crop.cost_breakdown && (
                        <div className="mt-2 p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span>বীজ ও চারা প্রস্তুতি:</span>
                            <span className="font-bold text-slate-800">৳{Number(crop.cost_breakdown.seed_cost).toLocaleString('bn-BD')}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span>সার ও পুষ্টি ব্যবস্থাপনা {crop.cost_breakdown.fertilizer_savings > 0 ? `(৳${crop.cost_breakdown.fertilizer_savings} জৈব সাশ্রয় সহ)` : ''}:</span>
                            <span className="font-bold text-slate-800">৳{Number(crop.cost_breakdown.fertilizer_cost).toLocaleString('bn-BD')}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span>সেচ ও পানি:</span>
                            <span className="font-bold text-slate-800">৳{Number(crop.cost_breakdown.irrigation_cost).toLocaleString('bn-BD')}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>শ্রমিক, বালাইনাশক ও অন্যান্য:</span>
                            <span className="font-bold text-slate-800">৳{Number((crop.cost_breakdown.labor_and_operations || 0) + (crop.cost_breakdown.pesticide_cost || 0)).toLocaleString('bn-BD')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCrop(crop)}
                      className={`w-full min-h-12 py-3 px-4 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs sm:text-sm ${
                        isSelected ? 'bg-emerald-800 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4" aria-hidden="true" /> : <Sprout className="w-4 h-4" aria-hidden="true" />}
                      <span>{isSelected ? 'নির্বাচিত চাষ পরিকল্পনা (Active)' : 'এই ফসল চাষের জন্য নির্বাচন করুন'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= 2. INTEGRATED FARMING COMBINATIONS (FR-12) ================= */}
      {showIntegrated && integratedOptions.length > 0 && (
        <section aria-labelledby="rec-tab-integrated" className="space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Waves className="w-5 h-5 text-teal-600" aria-hidden="true" />
            <span>২. সমন্বিত খামার পরিকল্পনা (Integrated Farming)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {integratedOptions.map((combo, idx) => (
              <div key={combo.combo_id || idx} className="bg-white rounded-3xl p-5 sm:p-6 border border-teal-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base sm:text-lg font-bold text-slate-900">{combo.title}</h4>
                  <span className="flex-none inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                    বিশেষজ্ঞের পরামর্শ আবশ্যক
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{combo.description}</p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">সম্ভাব্য বিনিয়োগ পরিসর</span>
                    <span className="font-bold text-slate-800">৳{Number(combo.est_cost_min).toLocaleString('bn-BD')} – ৳{Number(combo.est_cost_max).toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 block">সম্ভাব্য আয় পরিসর</span>
                    <span className="font-bold text-emerald-800">৳{Number(combo.est_return_min).toLocaleString('bn-BD')} – ৳{Number(combo.est_return_max).toLocaleString('bn-BD')}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-teal-50/60 p-3 rounded-xl border border-teal-100">
                  <strong>সামঞ্জস্য কারণ:</strong> {combo.reason}
                </div>

                {combo.risk_note && (
                  <div className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div><strong>ঝুঁকি ও সতর্কতা:</strong> {combo.risk_note}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= 3. WASTE-TO-VALUE RULES (FR-13, FR-22) ================= */}
      {showWaste && wasteOptions.length > 0 && (
        <section aria-labelledby="rec-tab-waste" className="space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Recycle className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <span>৩. বর্জ্য থেকে সম্পদ ও নিরাপদ পুনর্ব্যবহার (Waste-to-Value)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {wasteOptions.map((rule, idx) => (
              <div key={rule.rule_id || idx} className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      উপজাত: {rule.by_product}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1.5">{rule.target_activity}</h4>
                  </div>
                  <span className="flex-none inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                    বিশেষজ্ঞ যাচাই
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <strong>প্রস্তুত ও ব্যবহার পদ্ধতি:</strong> {rule.usage_method}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">প্রক্রিয়াজাত খরচ</span>
                    <span className="font-bold text-slate-800">৳{Number(rule.est_cost_min).toLocaleString('bn-BD')} – ৳{Number(rule.est_cost_max).toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 block">সম্ভাব্য সাশ্রয় / আয়</span>
                    <span className="font-bold text-emerald-800">৳{Number(rule.est_return_min).toLocaleString('bn-BD')} – ৳{Number(rule.est_return_max).toLocaleString('bn-BD')}</span>
                  </div>
                </div>

                {/* Mandatory Safety Note (FR-13, FR-22) */}
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><strong>নিরাপত্তা নির্দেশিকা:</strong> {rule.safety_note}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= 4. DISCLAIMERS (FR-21, FR-22) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Info className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>প্রাক্কলন ও অনিশ্চয়তা নির্দেশিকা</span>
          </div>
          <p className="leading-relaxed">
            {uncertaintyNote || 'প্রদর্শিত ব্যয় ও সম্ভাব্য মুনাফা BRRI/BARI তথ্যভিত্তিক আনুমানিক পরিসর; আবহাওয়া ও বাজারদরের কারণে প্রকৃত ফলাফল পরিবর্তিত হতে পারে।'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-700" aria-hidden="true" />
            <span>বিশেষজ্ঞ যাচাইকরণ নোটিশ</span>
          </div>
          <p className="leading-relaxed">
            {expertNotice || 'বড় পরিসরে চাষাবাদ বা নতুন সমন্বিত খামার শুরুর পূর্বে স্থানীয় উপজেলা কৃষি/মৎস্য/প্রাণিসম্পদ কর্মকর্তার সাথে পরামর্শ করে নিন।'}
          </p>
        </div>
      </div>

      {/* ================= 5. USEFULNESS FEEDBACK WIDGET (FR-32) ================= */}
      {recommendationId && (
        <section aria-labelledby="feedback-heading" className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 id="feedback-heading" className="text-base font-bold text-slate-900">
                এই সুপারিশটি কি আপনার খামারের জন্য সহায়ক ছিল?
              </h3>
              <p className="text-xs text-slate-500">আপনার মতামত agroWish সুপারিশ ইঞ্জিনকে আরও নির্ভুল করতে সাহায্য করবে।</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={feedbackHelpful === true}
                onClick={() => setFeedbackHelpful(true)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 min-h-11 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  feedbackHelpful === true
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                }`}
              >
                <ThumbsUp className="w-4 h-4" aria-hidden="true" />
                <span>হ্যাঁ, সহায়ক</span>
              </button>

              <button
                type="button"
                aria-pressed={feedbackHelpful === false}
                onClick={() => setFeedbackHelpful(false)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 min-h-11 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  feedbackHelpful === false
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50'
                }`}
              >
                <ThumbsDown className="w-4 h-4" aria-hidden="true" />
                <span>আরও উন্নতি প্রয়োজন</span>
              </button>
            </div>
          </div>

          {feedbackHelpful !== null && (
            <form onSubmit={handleSubmitFeedback} className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label htmlFor="rec-feedback-comment" className="block text-xs font-semibold text-slate-700 mb-1">
                  সংক্ষিপ্ত মন্তব্য (ঐচ্ছিক)
                </label>
                <textarea
                  id="rec-feedback-comment"
                  name="comment"
                  rows={2}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="আপনার অভিজ্ঞতা বা পরামর্শ লিখুন..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={feedbackSubmitting}
                className="px-6 py-2.5 min-h-11 bg-slate-900 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {feedbackSubmitting ? 'পাঠানো হচ্ছে...' : 'মতামত জমা দিন'}
              </button>
            </form>
          )}

          {feedbackMessage && (
            <div role="status" aria-live="polite" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              {feedbackMessage}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

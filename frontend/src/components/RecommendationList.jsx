/**
 * agroWish Frontend - Crop Recommendation & Comparison Cards Component
 * SE-331 Software Engineering Design Capstone Project
 * Member 1: Md Adnan Ul Islam (ID: 241-35-103)
 * Lead: AI, Algorithm & Backend Engineer
 * 
 * SRS Reference:
 * - Section 5: FR-08, FR-09, FR-10, FR-11, FR-12, FR-14, FR-15, FR-16, FR-35
 * - Section 6: NFR-01 (Performance & Precision)
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
  Droplet, 
  Check, 
  Info, 
  Recycle, 
  Waves,
  RefreshCw,
  Wheat,
  ShieldCheck
} from 'lucide-react';

export default function RecommendationList({ onNavigateToProfile }) {
  const [recommendations, setRecommendations] = useState([]);
  const [farmerSummary, setFarmerSummary] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedCostId, setExpandedCostId] = useState(null);
  const [selectedCropId, setSelectedCropId] = useState(null);
  const [selectionNotice, setSelectionNotice] = useState('');

  // Fetch recommendations from GET /api/recommendations
  const fetchRecommendations = async () => {
    const token = localStorage.getItem('agrowish_token');
    if (!token) {
      setErrorMessage('অনুগ্রহ করে লগইন করুন।');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/recommendations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 400) {
          setErrorMessage(data.message || 'প্রথমে আপনার খামারের তথ্য ও জমির পরিমাপ সম্পূর্ণ করুন।');
        } else {
          throw new Error(data.message || 'সুপারিশ লোড করতে ব্যর্থ হয়েছে।');
        }
        setRecommendations([]);
        return;
      }

      setRecommendations(data.recommendations || []);
      setFarmerSummary(data.farmer_summary || null);
      setIsFallback(Boolean(data.is_fallback));
      setFallbackReason(data.fallback_reason || '');

      // Check if user previously selected a crop in this session
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
    fetchRecommendations();
  }, []);

  const toggleCostAccordion = (cropId) => {
    setExpandedCostId((prev) => (prev === cropId ? null : cropId));
  };

  const handleSelectCrop = (crop) => {
    setSelectedCropId(crop.crop_id);
    localStorage.setItem('agrowish_selected_crop', crop.crop_id.toString());
    setSelectionNotice(`অভিনন্দন! আপনি আপনার খামারের জন্য "${crop.bengali_name}" সফলভাবে নির্বাচন করেছেন।`);
    setTimeout(() => {
      setSelectionNotice('');
    }, 4000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center min-h-[350px]">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="font-bold text-slate-800 text-base">এআই ফসল ও বাজেট সুপারিশ প্রস্তুত হচ্ছে...</h3>
        <p className="text-xs text-slate-500 mt-1">মাটির ধরণ, জলবায়ু ও ব্যয়ের গাণিতিক মডেল যাচাই করা হচ্ছে (FR-08)</p>
      </div>
    );
  }

  // If profile is incomplete
  if (errorMessage && recommendations.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xs text-center space-y-4">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">খামারের তথ্য অসম্পূর্ণ</h3>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          {errorMessage}
        </p>
        <button
          onClick={onNavigateToProfile}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition-all cursor-pointer text-xs sm:text-sm"
        >
          <Layers className="w-4 h-4" />
          <span>খামারের তথ্য ফর্মে যান</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                উপযুক্ত ফসলের সুপারিশ ও বাজেট বিশ্লেষণ (FR-08, FR-14)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              আপনার খামারের জমির পরিমাণ, মাটি ও মৌসুমি বৈশিষ্ট্যের ভিত্তিতে এআই বিশ্লেষিত লাভজনক বিকল্পসমূহ
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchRecommendations}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>রিফ্রেশ</span>
            </button>
            <span className="text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl font-semibold border border-emerald-200">
              {recommendations.length} টি ফসল বিশ্লেষিত
            </span>
          </div>
        </div>

        {/* Farmer Condition Pill Strip */}
        {farmerSummary && (
          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">খামারের প্রোফাইল:</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              জেলা: {farmerSummary.district || 'অনির্দিষ্ট'}
            </span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              জমি: {farmerSummary.land_size} শতক
            </span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              মাটি: {farmerSummary.soil_type}
            </span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              মৌসুম: {farmerSummary.season}
            </span>
            {farmerSummary.budget > 0 && (
              <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold">
                বাজেট: ৳{farmerSummary.budget}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Fallback Algorithm Banner (SRS FR-35) */}
      {isFallback && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <div className="font-bold">বিকল্প সুপারিশ অ্যালগরিদম সক্রিয় (Fallback Engine Active - FR-35)</div>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              {fallbackReason || 'মাটির ধরন বা বাজেটের সরাসরি ফসল না থাকায় বিকল্প অনুকূল ফসল প্রাক্কলন করা হয়েছে।'}
            </p>
          </div>
        </div>
      )}

      {/* Selection Toast Alert */}
      {selectionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white flex items-center gap-3 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{selectionNotice}</span>
        </div>
      )}

      {/* Recommended Crop Cards Grid (FR-15, FR-23) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {recommendations.map((crop, index) => {
          const isSelected = selectedCropId === crop.crop_id;
          const isExpanded = expandedCostId === crop.crop_id;

          return (
            <div
              key={crop.crop_id}
              className={`rounded-3xl border transition-all duration-200 overflow-hidden bg-white shadow-xs hover:shadow-md ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-200/90 hover:border-emerald-300'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 sm:p-6 pb-4 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        র‌্যাঙ্ক #{index + 1}
                      </span>
                      {crop.is_fallback ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {crop.fallback_tag}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          অনুকূল পছন্দ
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">
                      {crop.bengali_name} ({crop.crop_name})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{crop.crop_category}</p>
                  </div>

                  {/* Season Badge */}
                  <div className="text-right flex flex-col items-end">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      {crop.season} মৌসুম
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {crop.duration_days} দিন মেয়াদ
                    </span>
                  </div>
                </div>

                {/* Synergy Badges (FR-16) */}
                {crop.synergy_badges && crop.synergy_badges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {crop.synergy_badges.map((badge, bIdx) => (
                      <span
                        key={bIdx}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg"
                      >
                        {badge.type === 'ORGANIC_SAVINGS' ? (
                          <Recycle className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Waves className="w-3.5 h-3.5 text-teal-600" />
                        )}
                        {badge.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Metrics Grid (FR-14, FR-15) */}
              <div className="p-5 sm:p-6 pt-4 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Estimated Cost */}
                  <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      মোট আনুমানিক খরচ
                    </span>
                    <div className="text-base sm:text-lg font-black text-slate-800 mt-1">
                      ৳ {crop.total_estimated_cost.toLocaleString('bn-BD')}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      (৳{crop.cost_per_decimal}/শতক)
                    </span>
                  </div>

                  {/* Projected Gross Return */}
                  <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      সম্ভাব্য মোট আয়
                    </span>
                    <div className="text-base sm:text-lg font-black text-slate-800 mt-1">
                      ৳ {crop.total_gross_return.toLocaleString('bn-BD')}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      (৳{crop.return_per_decimal}/শতক)
                    </span>
                  </div>

                  {/* Projected Net Profit */}
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-2xs col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                      প্রত্যাশিত নিট লাভ
                    </span>
                    <div className="text-base sm:text-lg font-black text-emerald-700 mt-1">
                      ৳ {crop.projected_net_profit.toLocaleString('bn-BD')}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-bold mt-0.5">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      <span>ROI: +{crop.profit_margin_roi}%</span>
                    </div>
                  </div>
                </div>

                {/* Certified Varieties Preview */}
                {crop.varieties && crop.varieties.length > 0 && (
                  <div className="text-xs">
                    <span className="font-semibold text-slate-700">অনুমোদিত সার্টিফাইড জাত:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {crop.varieties.map((v, vIdx) => (
                        <span
                          key={vIdx}
                          className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px] shadow-2xs"
                        >
                          {v.name_bn || v.name} {v.yield_kg ? `(${v.yield_kg})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Itemized Cost Breakdown Accordion (FR-14, FR-15) */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => toggleCostAccordion(crop.crop_id)}
                    className="w-full flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:border-emerald-200 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>বিস্তারিত খরচ বিবরণ (Itemized Cost Breakdown)</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && crop.cost_breakdown && (
                    <div className="mt-2 p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600 animate-in fade-in">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span>১. বীজ ও চারা প্রস্তুতি (Seed Cost - 15%):</span>
                        <span className="font-bold text-slate-800">৳ {crop.cost_breakdown.seed_cost.toLocaleString('bn-BD')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <div>
                          <span>২. সার ও কীটনাশক (Fertilizer - 35%):</span>
                          {crop.cost_breakdown.fertilizer_savings > 0 && (
                            <span className="text-[10px] text-emerald-600 block">
                              (জৈব সারের কারণে ৳{crop.cost_breakdown.fertilizer_savings} সাশ্রয় বাদ দিয়ে)
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-800">৳ {crop.cost_breakdown.fertilizer_cost.toLocaleString('bn-BD')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span>৩. সেচ ও জ্বালানি (Irrigation - 25%):</span>
                        <span className="font-bold text-slate-800">৳ {crop.cost_breakdown.irrigation_cost.toLocaleString('bn-BD')}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>৪. শ্রমিক ও জমি তৈরি (Labor & Ops - 25%):</span>
                        <span className="font-bold text-slate-800">৳ {crop.cost_breakdown.labor_and_operations.toLocaleString('bn-BD')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selection Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCrop(crop)}
                    className={`w-full py-3 px-4 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs sm:text-sm ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>নির্বাচিত চাষ পরিকল্পনা (Active Plan)</span>
                      </>
                    ) : (
                      <>
                        <Sprout className="w-4 h-4" />
                        <span>এই ফসল চাষের জন্য নির্বাচন করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grounded Quality & Uncertainty Footer Note (FR-21, FR-22) */}
      <div className="p-5 rounded-2xl bg-slate-100/70 border border-slate-200 text-slate-500 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>প্রাক্কলন ও সতর্কতা নির্দেশিকা (SRS FR-21, FR-22)</span>
        </div>
        <p className="leading-relaxed">
          প্রদর্শিত উৎপাদন খরচ ও সম্ভাব্য মুনাফা বাংলাদেশ ধান গবেষণা ইনস্টিটিউট (BRRI) ও বাংলাদেশ কৃষি গবেষণা ইনস্টিটিউট (BARI) এর প্রমিত ডাটা অনুযায়ী হিসাব করা। স্থানীয় জলবায়ুর প্রভাব ও বাজার মূল্যের পরিবর্তনের কারণে বাস্তব ফলাফল সামান্য পরিবর্তিত হতে পারে।
        </p>
      </div>
    </div>
  );
}


/**
 * agroWish Frontend - Recommendation History & Traceability Viewer
 * SRS Reference: FR-24 (History & Traceability), FR-27 (Data Isolation), FR-32 (Feedback), FR-34 (Model/Input Snapshot)
 */

import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Cpu,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  RefreshCw,
  Layers,
  Sprout,
  Recycle
} from 'lucide-react';

export default function RecommendationHistory({ onGenerateNew }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistory = async () => {
    const token = localStorage.getItem('agrowish_token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/recommendations/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'ইতিহাস লোড করা যায়নি।');
      setHistory(data.history || []);
      if (data.history && data.history.length > 0 && !expandedId) {
        setExpandedId(data.history[0].recommendation_id);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-600 font-medium">পূর্ববর্তী সুপারিশের ইতিহাস লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <History className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              পূর্ববর্তী সুপারিশ ও বিশ্লেষণের ইতিহাস
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              পূর্বে সংরক্ষিত খামার ইনপুট, মডেল সংস্করণ ও প্রদত্ত মতামতের পূর্ণাঙ্গ ট্রেসেবিলিটি।
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchHistory}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span>রিফ্রেশ</span>
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {history.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center space-y-4">
          <History className="w-12 h-12 text-slate-300 mx-auto" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-800">এখনো কোনো সংরক্ষিত সুপারিশ নেই</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            "উপযুক্ত ফসলের সুপারিশ" ট্যাবে গিয়ে নতুন সমন্বিত সুপারিশ তৈরি করলে তা স্বয়ংক্রিয়ভাবে এখানে সংরক্ষিত হবে।
          </p>
          {onGenerateNew && (
            <button
              type="button"
              onClick={onGenerateNew}
              className="px-6 py-3 min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs sm:text-sm cursor-pointer"
            >
              এখনই সুপারিশ তৈরি করুন
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((rec) => {
            const isOpen = expandedId === rec.recommendation_id;
            const req = rec.request_data || {};
            const dateStr = new Date(rec.created_at).toLocaleString('bn-BD', {
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            return (
              <article key={rec.recommendation_id} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId(isOpen ? null : rec.recommendation_id)}
                  className="w-full p-5 sm:p-6 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        সুপারিশ #{rec.recommendation_id}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        {dateStr}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                        <Cpu className="w-3 h-3" aria-hidden="true" />
                        {rec.model_version || 'v2.0'}
                      </span>
                      {rec.feedback && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          rec.feedback.is_helpful ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {rec.feedback.is_helpful ? <ThumbsUp className="w-3 h-3" aria-hidden="true" /> : <ThumbsDown className="w-3 h-3" aria-hidden="true" />}
                          <span>রেটিং: {rec.feedback.rating}/৫</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2">
                      {req.district || 'বাংলাদেশ'} • {req.land_size || 0} শতক ({req.soil_type || 'দোআঁশ'}) • {req.season || 'রবি'} মৌসুম • বাজেট: ৳{req.budget || 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <span>{isOpen ? 'সংক্ষিপ্ত করুন' : 'বিস্তারিত দেখুন'}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 space-y-5 bg-slate-50/40">
                    {/* Traceable Input Snapshot (FR-34) */}
                    <div className="mt-4 p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Layers className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                        <span>ব্যবহৃত ইনপুট স্ন্যাপশট (Input Traceability)</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">জেলা: {req.district || '-'}</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">উপজেলা: {req.upazila || '-'}</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">জমি: {req.land_size || 0} শতক</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">মাটি: {req.soil_type || '-'}</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">পানি: {req.water_availability || '-'}</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">মৌসুম: {req.season || '-'}</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">বাজেট: ৳{req.budget || 0}</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">রেকর্ডকৃত সম্পদ: {req.resources_count || 0} টি</span>
                      </div>
                      <p className="text-xs text-slate-700 pt-2 border-t border-slate-100 leading-relaxed">
                        {rec.explanation_bn}
                      </p>
                    </div>

                    {/* Saved Crop Options */}
                    {rec.crop_options && rec.crop_options.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Sprout className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                          <span>প্রস্তাবিত ফসল ({rec.crop_options.length} টি)</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {rec.crop_options.map((item) => (
                            <div key={item.item_id} className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>{item.title}</span>
                                <span className="text-emerald-700">আস্থা: {Math.round(item.confidence_score)}%</span>
                              </div>
                              <div className="text-slate-600">
                                ব্যয়: ৳{item.est_cost_min} - ৳{item.est_cost_max} | আয়: ৳{item.est_return_min} - ৳{item.est_return_max}
                              </div>
                              {item.reason && <div className="text-[11px] text-slate-500">{item.reason}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Saved Integrated + Waste Items */}
                    {((rec.integrated_options && rec.integrated_options.length > 0) || (rec.waste_to_value_options && rec.waste_to_value_options.length > 0)) && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Recycle className="w-4 h-4 text-teal-600" aria-hidden="true" />
                          <span>সমন্বিত চাষ ও বর্জ্য-থেকে-সম্পদ পরামর্শ</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[...(rec.integrated_options || []), ...(rec.waste_to_value_options || [])].map((item) => (
                            <div key={item.item_id} className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                              <div className="font-bold text-slate-800">{item.title}</div>
                              {item.safety_note && (
                                <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                  {item.safety_note}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.feedback && rec.feedback.comment && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                        <strong>আপনার মন্তব্য:</strong> {rec.feedback.comment}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

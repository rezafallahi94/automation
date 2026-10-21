import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Search, 
  ExternalLink, 
  Compass, 
  Loader2, 
  ShieldCheck, 
  Building2, 
  Navigation, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface MapsGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

interface GroundingChunk {
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: Array<{
        snippet?: string;
        reviewUri?: string;
      }>;
    };
  };
  web?: {
    uri?: string;
    title?: string;
  };
}

export const MapsGroundingModal: React.FC<MapsGroundingModalProps> = ({
  isOpen,
  onClose,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery || 'استعلام موقعیت مکانی و نشانی پروژه در تهران');
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string>('');
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('');

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Request browser geolocation if available
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setLocationStatus('مختصات جغرافیایی کاربر دریافت شد');
        },
        () => {
          // Default to Tehran coordinates
          setUserLocation({ latitude: 35.6892, longitude: 51.3890 });
          setLocationStatus('مختصات پیش‌فرض تهران لحاظ شد');
        },
        { timeout: 5000 }
      );
    }
  }, [isOpen]);

  const handleSearch = async (searchPrompt?: string) => {
    const promptToSend = searchPrompt || query;
    if (!promptToSend.trim()) return;

    setLoading(true);
    setResultText('');
    setGroundingChunks([]);

    try {
      const response = await fetch('/api/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          latLng: userLocation
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'خطا در برقراری ارتباط با سرویس نقشه');
      }

      setResultText(data.text || 'اطلاعات با موفقیت دریافت شد.');
      setGroundingChunks(data.groundingChunks || []);
    } catch (err: any) {
      setResultText(`خطا: ${err.message || 'عدم امکان دریافت داده‌های نقشه'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Extract all maps places with uri
  const mapPlaces = groundingChunks
    .map(chunk => chunk.maps)
    .filter((maps): maps is NonNullable<typeof maps> => Boolean(maps && maps.title));

  const quickPresets = [
    'مسیرهای دسترسی، بزرگراه‌ها و معابر مجاور پروژه',
    'شهرداری و دفاتر خدمات الکترونیک شهر مجاور',
    'مراکز اداری، صنعتی و تجاری پیرامون',
    'تامین‌کنندگان متریال و تجهیزات در محدوده'
  ];

  return (
    <div className="fixed inset-0 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4 text-red-600" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-[#13213c]">
                تحلیل جغرافیایی و مکان‌یابی هوشمند (Google Maps Grounding)
              </h3>
              <p className="text-[11px] text-slate-500">
                مبتنی بر مدل Gemini 2.5 Flash با ابزار رسمی Google Maps جهت اعتبارسنجی موقعیت و نشانی دقیق پروژه‌ها
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Search bar */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="موقعیت پروژه، نشانی و یا استعلام جغرافیایی را جستجو کنید..."
                  className="w-full text-xs pr-9 pl-3 p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c]"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={loading}
                className="bg-[#13213c] hover:bg-[#1d325a] disabled:bg-slate-300 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                <span>استعلام با Google Maps</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-semibold">پیشنهادهای پرکاربرد رابو:</span>
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(preset);
                    handleSearch(preset);
                  }}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              <div className="text-xs font-bold text-slate-700">
                در حال دریافت اطلاعات معتبر مکانی از Google Maps...
              </div>
              <div className="text-[11px] text-slate-400">
                تحلیل ژئوگرافیک با مدل Gemini 2.5 Flash
              </div>
            </div>
          )}

          {/* Results Display */}
          {!loading && resultText && (
            <div className="space-y-4">
              {/* Maps Places & Links (Required for Maps Grounding) */}
              {mapPlaces.length > 0 && (
                <div className="bg-red-50/50 border border-red-200/80 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-red-900">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span>مکان‌های شناسایی شده در Google Maps (پیوندهای مستقیم نقشه):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mapPlaces.map((place, idx) => (
                      <a
                        key={idx}
                        href={place.uri || `https://maps.google.com/?q=${encodeURIComponent(place.title || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white hover:bg-red-50/70 border border-red-200 p-2.5 rounded-lg flex items-center justify-between group transition-all shadow-xs"
                      >
                        <div className="overflow-hidden">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-red-700 transition-colors block truncate">
                            {place.title}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>مشاهده در نقشه Google Maps</span>
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Narrative */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>تحلیل کارشناسی موقعیت و دسترسی‌های ایمنی:</span>
                </h4>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {resultText}
                </div>
              </div>
            </div>
          )}

          {!loading && !resultText && (
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              عبارت مد نظر را تایپ نمایید یا از گزینه‌های آماده برای استعلام دقیق نقشه استفاده فرمایید.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span>{locationStatus || 'سرویس نقشه فعال است'}</span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};

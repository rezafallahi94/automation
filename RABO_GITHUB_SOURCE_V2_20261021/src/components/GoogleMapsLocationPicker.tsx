import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Compass, 
  ExternalLink, 
  Search, 
  Car, 
  Layers,
  Crosshair,
  Copy,
  Check
} from 'lucide-react';
import L from 'leaflet';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  addressDescription?: string;
}

interface GoogleMapsLocationPickerProps {
  initialLocation?: LocationCoordinates;
  onSelectLocation: (loc: LocationCoordinates) => void;
  title?: string;
  readOnly?: boolean;
  addressValue?: string;
  onAddressChange?: (address: string) => void;
}

export const RABO_CENTRAL_OFFICE = {
  lat: 35.7612,
  lng: 51.4185,
  name: 'دفتر مرکزی شرکت مهندسی رابو (میرداماد)'
};

export const TEHRAN_PRESETS = [
  { name: 'سعادت‌آباد / میدان کاج', lat: 35.7820, lng: 51.3730, zone: 'منطقه ۲' },
  { name: 'میرداماد / دفتر مرکزی رابو', lat: 35.7612, lng: 51.4185, zone: 'منطقه ۳' },
  { name: 'ونک / ملاصدرا', lat: 35.7570, lng: 51.3995, zone: 'منطقه ۳' },
  { name: 'نیاوران / کامرانیه', lat: 35.8120, lng: 51.4550, zone: 'منطقه ۱' },
  { name: 'تجریش / الهیه', lat: 35.8050, lng: 51.4310, zone: 'منطقه ۱' },
  { name: 'پاسداران / هروی', lat: 35.7690, lng: 51.4680, zone: 'منطقه ۴' },
  { name: 'صادقیه / پونک / مرزداران', lat: 35.7380, lng: 51.3320, zone: 'منطقه ۵' },
  { name: 'یوسف‌آباد / امیرآباد', lat: 35.7280, lng: 51.4050, zone: 'منطقه ۶' },
  { name: 'تهرانپارس / فلکه اول', lat: 35.7350, lng: 51.5230, zone: 'منطقه ۸' },
  { name: 'شهرک غرب / دادمان', lat: 35.7630, lng: 51.3650, zone: 'منطقه ۲' },
  { name: 'جاده مخصوص / شهرک دارویی', lat: 35.7088, lng: 51.2215, zone: 'منطقه ۲۱' }
];

export const GoogleMapsLocationPicker: React.FC<GoogleMapsLocationPickerProps> = ({
  initialLocation = { lat: 35.7820, lng: 51.3730, addressDescription: 'تهران، سعادت‌آباد، میدان کاج' },
  onSelectLocation,
  title = 'نقشه و نشانی یکپارچه پروژه',
  readOnly = false,
  addressValue,
  onAddressChange
}) => {
  const [currentLoc, setCurrentLoc] = useState<LocationCoordinates>(initialLocation);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const currentAddress = addressValue !== undefined ? addressValue : (currentLoc.addressDescription || '');

  // بارگذاری استایل Leaflet در صورت عدم وجود
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // راه‌اندازی نقشه تعاملی Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLoc.lat, currentLoc.lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });
    mapInstanceRef.current = map;

    // لایه نقشه خیابان
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // آیکون اختصاصی نشانگر رابو با پین برجسته
    const customIcon = L.divIcon({
      className: 'rabo-map-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: #13213c; color: white; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; border: 1px solid #f59e0b; box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap; margin-bottom: 2px;">
            📍 موقعیت پروژه
          </div>
          <div style="width: 24px; height: 24px; background: #800000; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 4px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; background: #fbbf24; border-radius: 50%;"></div>
          </div>
          <div style="width: 2px; height: 10px; background: #800000;"></div>
        </div>
      `,
      iconSize: [30, 42],
      iconAnchor: [15, 42]
    });

    // نشانگر قابل جابجایی
    const marker = L.marker([currentLoc.lat, currentLoc.lng], {
      draggable: !readOnly,
      icon: customIcon
    }).addTo(map);
    markerRef.current = marker;

    // جابجایی نشانگر با Drag & Drop
    if (!readOnly) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        handleUpdateCoords(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
      });

      // کلیک در هر کجای نقشه برای جابجایی پین
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(5));
        const lng = Number(e.latlng.lng.toFixed(5));
        marker.setLatLng([lat, lng]);
        handleUpdateCoords(lat, lng);
      });
    }

    // بازنشانی ابعاد نقشه برای جلوگیری از عدم پاسخگویی یا رندر ناقص
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
    setTimeout(() => {
      map.invalidateSize();
    }, 400);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // تغییر نوع نقشه (خیابان یا ماهواره)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    if (mapType === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(mapInstanceRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 }
      ).addTo(mapInstanceRef.current);
    }
  }, [mapType]);

  const handleUpdateCoords = (lat: number, lng: number, desc?: string) => {
    // تقریب نشانی بر اساس نزدیک‌ترین محدوده
    const matchedPreset = TEHRAN_PRESETS.find(p => {
      const d = Math.hypot(p.lat - lat, p.lng - lng);
      return d < 0.015;
    });

    const newDesc = desc || (matchedPreset ? `تهران، ${matchedPreset.zone}، محدوده ${matchedPreset.name}` : currentAddress || `مختصات: ${lat}, ${lng}`);

    const newLoc: LocationCoordinates = {
      lat,
      lng,
      addressDescription: newDesc
    };

    setCurrentLoc(newLoc);
    onSelectLocation(newLoc);
    if (onAddressChange && newDesc) {
      onAddressChange(newDesc);
    }
  };

  const handlePresetSelect = (preset: typeof TEHRAN_PRESETS[0]) => {
    handleUpdateCoords(preset.lat, preset.lng, `تهران، ${preset.zone}، محدوده ${preset.name}`);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lng], 16, { duration: 1 });
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([preset.lat, preset.lng]);
    }
  };

  const handleSearchFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const match = TEHRAN_PRESETS.find(p => p.name.includes(searchQuery.trim()) || p.zone.includes(searchQuery.trim()));
    if (match) {
      handlePresetSelect(match);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        handleUpdateCoords(lat, lng, 'موقعیت جاری کاربر');
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      () => {
        // Fallback to Rabo central
        handlePresetSelect(TEHRAN_PRESETS[1]);
      }
    );
  };

  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${currentLoc.lat}, ${currentLoc.lng}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Top Header */}
      <div className="bg-[#13213c] text-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">{title}</h4>
            <span className="text-[11px] text-slate-300">موقعیت‌یابی تعاملی (کلیک یا درگ پین روی نقشه)، نشانی و مسیریابی نشان، بلد و اسنپ</span>
          </div>
        </div>

        {/* Launchers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => window.open(`https://neshan.org/maps/@${currentLoc.lat},${currentLoc.lng},16z,0p`, '_blank')}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
            title="باز کردن در نقشه و مسیریاب نشان"
          >
            <span>نشان</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => window.open(`https://balad.ir/location?latitude=${currentLoc.lat}&longitude=${currentLoc.lng}`, '_blank')}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
            title="باز کردن در نقشه و مسیریاب بلد"
          >
            <span>بلد</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => window.open(`https://app.snapp.taxi/ride?dest_lat=${currentLoc.lat}&dest_lng=${currentLoc.lng}&dest_name=${encodeURIComponent(currentAddress || 'پروژه رابو')}`, '_blank')}
            className="flex items-center gap-1 bg-[#22c55e] hover:bg-[#16a34a] text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
            title="درخواست اسنپ مستقیم به مقصد این پروژه"
          >
            <Car className="w-3.5 h-3.5" />
            <span>اسنپ گرفتن</span>
          </button>

          <button
            type="button"
            onClick={() => window.open(`https://www.google.com/maps?q=${currentLoc.lat},${currentLoc.lng}`, '_blank')}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
            title="مشاهده در گوگل‌مپ"
          >
            <span>گوگل‌مپ</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Unified Address Input */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200">
        <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-600" />
            <span>نشانی کامل و دقیق پروژه (یکپارچه با نقشه):</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {currentLoc.lat}, {currentLoc.lng}
          </span>
        </label>
        <textarea
          rows={2}
          value={currentAddress}
          onChange={(e) => {
            const newText = e.target.value;
            if (onAddressChange) onAddressChange(newText);
            setCurrentLoc(prev => ({ ...prev, addressDescription: newText }));
            onSelectLocation({ ...currentLoc, addressDescription: newText });
          }}
          placeholder="مثال: تهران، منطقه ۲، سعادت‌آباد، خیابان سرو غربی، کوچه ارغوان، پلاک ۱۴، طبقه ۳"
          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white leading-relaxed"
        />
      </div>

      {/* Preset Neighborhoods Bar */}
      <div className="px-3.5 py-2 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2 overflow-x-auto text-[11px]">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-500 font-bold shrink-0">انتخاب سریع محله:</span>
          {TEHRAN_PRESETS.slice(0, 6).map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetSelect(p)}
              className="shrink-0 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer"
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Map Type Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMapType(prev => prev === 'streets' ? 'satellite' : 'streets')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            title="تغییر لایه نقشه (معمولی / ماهواره‌ای)"
          >
            <Layers className="w-3 h-3 text-slate-600" />
            <span>{mapType === 'streets' ? 'نمای ماهواره‌ای' : 'نمای خیابان'}</span>
          </button>
          <button
            type="button"
            onClick={handleLocateMe}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="موقعیت فعلی من"
          >
            <Crosshair className="w-3.5 h-3.5 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Interactive Leaflet Map Container */}
      <div className="relative h-72 sm:h-80 w-full overflow-hidden select-none bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        
        {/* Floating helper overlay */}
        <div className="absolute bottom-2.5 right-2.5 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-slate-700 border border-slate-200 shadow-xs flex items-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>روی هر نقطه از نقشه کلیک کنید یا پین را با موس جابجا نمایید</span>
        </div>

        {/* Copy coordinates pill */}
        <button
          type="button"
          onClick={copyCoordinates}
          className="absolute top-2.5 left-2.5 z-10 bg-white/95 px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-slate-700 border border-slate-200 shadow-xs flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
        >
          {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
          <span>{isCopied ? 'کپی شد' : `${currentLoc.lat}, ${currentLoc.lng}`}</span>
        </button>
      </div>

      {/* Manual Coordinate Inputs & Confirmation Bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5 flex-1">
            <label className="text-[11px] font-bold text-slate-600 shrink-0">عرض (Lat):</label>
            <input
              type="text"
              value={currentLoc.lat}
              onChange={e => {
                const val = parseFloat(e.target.value.replace(/[^\d.-]/g, ''));
                if (!isNaN(val)) {
                  handleUpdateCoords(val, currentLoc.lng);
                  if (markerRef.current) markerRef.current.setLatLng([val, currentLoc.lng]);
                  if (mapInstanceRef.current) mapInstanceRef.current.panTo([val, currentLoc.lng]);
                }
              }}
              className="w-full text-xs font-mono p-1.5 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-1">
            <label className="text-[11px] font-bold text-slate-600 shrink-0">طول (Lng):</label>
            <input
              type="text"
              value={currentLoc.lng}
              onChange={e => {
                const val = parseFloat(e.target.value.replace(/[^\d.-]/g, ''));
                if (!isNaN(val)) {
                  handleUpdateCoords(currentLoc.lat, val);
                  if (markerRef.current) markerRef.current.setLatLng([currentLoc.lat, val]);
                  if (mapInstanceRef.current) mapInstanceRef.current.panTo([currentLoc.lat, val]);
                }
              }}
              className="w-full text-xs font-mono p-1.5 border border-slate-300 rounded-lg bg-white"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onSelectLocation(currentLoc);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          }}
          className="flex items-center justify-center gap-1.5 bg-[#13213c] hover:bg-[#1e345b] text-white px-3.5 py-2 rounded-lg font-bold transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>تأیید موقعیت مکانی انتخابی</span>
        </button>
      </div>
    </div>
  );
};

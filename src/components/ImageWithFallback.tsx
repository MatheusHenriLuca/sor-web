import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  ZoomIn, 
  X, 
  Image as ImageIcon
} from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'ng' | 'ok' | 'neutral';
  emptyLabel?: string;
  showExternalLink?: boolean;
  allowZoom?: boolean;
  compact?: boolean;
  itemId?: number | string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = 'Evidência fotográfica',
  className = '',
  style,
  variant = 'neutral',
  emptyLabel,
  showExternalLink = true,
  allowZoom = true,
  compact = false,
  itemId
}) => {
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const createFallbackSvgDataUrl = (type: 'ng' | 'ok' | 'neutral', codeId?: number | string): string => {
    const isNg = type === 'ng';
    const bg = isNg ? '#fff1f2' : '#f0fdf4';
    const border = isNg ? '#f43f5e' : '#16a34a';
    const badgeBg = isNg ? '#e11d48' : '#15803d';
    const textPrimary = isNg ? '#881337' : '#14532d';
    const textSecondary = isNg ? '#be123c' : '#166534';
    const statusLabel = isNg ? 'NÃO CONFORME (NG)' : 'PADRÃO APROVADO (OK)';
    const codeLabel = codeId ? `RNC #${codeId}` : 'EVIDÊNCIA TÉCNICA';
    const titleText = isNg ? 'Evidência Fotográfica da Ocorrência (NG)' : 'Padrão de Referência Homologado (OK)';
    const subText = isNg ? 'Registro Técnico de Inspeção de Qualidade' : 'Conformidade Validada pela Qualidade';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <rect width="640" height="420" rx="16" fill="${bg}"/>
      <rect x="12" y="12" width="616" height="396" rx="12" fill="none" stroke="${border}" stroke-width="3" stroke-dasharray="${isNg ? '10,6' : 'none'}"/>
      <rect x="28" y="28" width="230" height="34" rx="8" fill="${badgeBg}"/>
      <text x="143" y="50" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">${statusLabel}</text>
      <text x="610" y="50" font-family="monospace" font-size="14" font-weight="bold" fill="${textSecondary}" text-anchor="end">${codeLabel}</text>
      <g transform="translate(320, 195)">
        <rect x="-150" y="-65" width="300" height="130" rx="14" fill="#ffffff" stroke="${border}" stroke-width="2.5"/>
        <circle cx="-95" cy="0" r="26" fill="${bg}" stroke="${border}" stroke-width="2.5"/>
        <circle cx="95" cy="0" r="26" fill="${bg}" stroke="${border}" stroke-width="2.5"/>
        <line x1="-50" y1="-35" x2="50" y2="-35" stroke="#64748b" stroke-width="3"/>
        <line x1="-50" y1="0" x2="50" y2="0" stroke="${border}" stroke-width="4"/>
        <line x1="-50" y1="35" x2="50" y2="35" stroke="#64748b" stroke-width="3"/>
        ${
          isNg
            ? `<circle cx="0" cy="0" r="38" fill="none" stroke="#e11d48" stroke-width="3.5" stroke-dasharray="6,4"/>
               <line x1="-18" y1="-18" x2="18" y2="18" stroke="#e11d48" stroke-width="4"/>
               <line x1="18" y1="-18" x2="-18" y2="18" stroke="#e11d48" stroke-width="4"/>`
            : `<circle cx="0" cy="0" r="34" fill="none" stroke="#16a34a" stroke-width="3.5"/>
               <polyline points="-14,2 -4,12 16,-10" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
        }
      </g>
      <text x="320" y="330" font-family="sans-serif" font-size="18" font-weight="bold" fill="${textPrimary}" text-anchor="middle">${titleText}</text>
      <text x="320" y="358" font-family="sans-serif" font-size="13" font-weight="600" fill="${textSecondary}" text-anchor="middle">${subText}</text>
      <text x="320" y="390" font-family="monospace" font-size="11" fill="#64748b" text-anchor="middle">ARMAZENAMENTO WEBP / SUPABASE STORAGE • SISTEMA DE GESTÃO DA QUALIDADE</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Extração e normalização de fotos e anexos
  const extractUrlAndFileName = (rawSrc?: string): { url: string; fileName: string } => {
    if (!rawSrc || !rawSrc.trim()) {
      return { url: '', fileName: '' };
    }
    const trimmed = rawSrc.trim();

    // 1. Caso Base64 / DataURL ou Blob local (upload de operador / captura de câmera WebP)
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
      return { url: trimmed, fileName: 'evidencia-webp.webp' };
    }

    // 2. Caso URL legada do SharePoint (Reserved_ImageAttachment ou sharepoint.com) -> converte para ilustração técnica SVG limpa
    if (
      trimmed.includes('sharepoint.com') ||
      trimmed.includes('Reserved_ImageAttachment') ||
      trimmed.startsWith('{')
    ) {
      return {
        url: createFallbackSvgDataUrl(variant, itemId),
        fileName: 'evidencia-tecnica.svg'
      };
    }

    // 3. URL padrão (HTTP / HTTPS / Supabase Storage CDN)
    return { url: trimmed, fileName: 'evidencia.webp' };
  };

  const { url: displayUrl } = extractUrlAndFileName(src);

  // Renderizador de Estado Sem Anexo ou Falha
  const renderEmptyOrFallback = () => {
    if (variant === 'ng') {
      return (
        <div 
          className={`flex flex-col items-center justify-center p-4 text-center bg-rose-50/80 border-2 border-dashed border-rose-200 rounded-xl text-rose-900 select-none transition-all ${className}`}
          style={style}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mb-2 text-rose-700 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <span className="text-xs font-bold text-rose-900">
            {emptyLabel || 'Peça com Defeito (NG)'}
          </span>
          <span className="text-xs text-rose-600 font-medium mt-1">
            Nenhuma evidência fotográfica anexada
          </span>
        </div>
      );
    }

    if (variant === 'ok') {
      return (
        <div 
          className={`flex flex-col items-center justify-center p-4 text-center bg-emerald-50/80 border-2 border-dashed border-emerald-200 rounded-xl text-emerald-900 select-none transition-all ${className}`}
          style={style}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-2 text-emerald-700 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-xs font-bold text-emerald-900">
            {emptyLabel || 'Padrão Aprovado (OK)'}
          </span>
          <span className="text-xs text-emerald-600 font-medium mt-1">
            Foto do padrão visual de conformidade
          </span>
        </div>
      );
    }

    return (
      <div 
        className={`flex flex-col items-center justify-center p-4 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-600 select-none ${className}`}
        style={style}
      >
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2 text-slate-500">
          <Camera className="w-5 h-5" />
        </div>
        <span className="text-xs font-semibold text-slate-700">
          {emptyLabel || 'Sem Anexo'}
        </span>
      </div>
    );
  };

  if (!displayUrl || hasError) {
    return renderEmptyOrFallback();
  }

  return (
    <>
      <div 
        className={`relative group overflow-hidden rounded-xl border ${
          variant === 'ng' ? 'border-rose-300 bg-rose-50' :
          variant === 'ok' ? 'border-emerald-300 bg-emerald-50' :
          'border-slate-200 bg-slate-50'
        } ${className}`} 
        style={style}
      >
        <img
          src={displayUrl}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-contain transition duration-200 group-hover:scale-102"
        />
        
        {/* Overlay com Ações e Zoom */}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-[1px]">
          {allowZoom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(true);
              }}
              className="p-2.5 bg-white text-slate-900 rounded-lg shadow-md hover:bg-slate-100 transition active:scale-95 cursor-pointer"
              title="Ampliar evidência"
            >
              <ZoomIn className="w-4 h-4 text-[#0f6cbd]" />
            </button>
          )}

          {showExternalLink && displayUrl && !displayUrl.startsWith('data:') && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 bg-white text-slate-900 rounded-lg shadow-md hover:bg-slate-100 transition active:scale-95 cursor-pointer"
              title="Abrir imagem em nova guia"
            >
              <ExternalLink className="w-4 h-4 text-slate-700" />
            </a>
          )}
        </div>
      </div>

      {/* Modal de Zoom Lightbox */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[92vh] w-full bg-white rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#0f6cbd]" />
                <span className="font-bold text-sm text-slate-900">{alt}</span>
              </div>
              <div className="flex items-center gap-2">
                {displayUrl && (
                  <a 
                    href={displayUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn-secondary h-8 px-3 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Original</span>
                  </a>
                )}
                <button 
                  onClick={() => setIsZoomed(false)}
                  className="btn-icon w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-900/5 rounded-xl p-3 w-full">
              <img 
                src={displayUrl} 
                alt={alt} 
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageWithFallback;

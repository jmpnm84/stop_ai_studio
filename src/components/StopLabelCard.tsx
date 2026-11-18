import React, { useEffect, useMemo, useRef, useState } from 'react';
import trigoLogo from '../assets/trigo-logo.jpg';
import { RESPONSAVEIS, type ReferenceItem, type StopLabelData } from '../types.ts';

interface StopLabelCardProps {
  id: 'bloco1' | 'bloco2';
  data: StopLabelData;
  motivoFontSize: number;
  references: ReferenceItem[];
  interactive?: boolean;
  onChange?: (patch: Partial<StopLabelData>) => void;
  onMotivoFontSizeChange?: (size: number) => void;
}

export const StopLabelCard: React.FC<StopLabelCardProps> = ({
  id,
  data,
  motivoFontSize,
  references,
  interactive = true,
  onChange,
  onMotivoFontSizeChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const motivoRef = useRef<HTMLTextAreaElement>(null);
  const obsRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(() => {
    const query = data.ref.trim().toLowerCase();
    if (!query || !interactive) return [];
    const matches: ReferenceItem[] = [];
    for (const item of references) {
      if (
        item.ref.toLowerCase().includes(query) ||
        item.peca.toLowerCase().includes(query)
      ) {
        matches.push(item);
        if (matches.length >= 30) break;
      }
    }
    return matches;
  }, [data.ref, references, interactive]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Dynamically fit Motivo font size (24px down to 10px) matching the original STOP behavior
  useEffect(() => {
    if (!interactive || !motivoRef.current || !onMotivoFontSizeChange) return;
    const el = motivoRef.current;
    el.style.fontSize = '24px';
    let size = 24;
    while (el.scrollHeight > el.offsetHeight && size > 10) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
    if (size !== motivoFontSize) {
      onMotivoFontSizeChange(size);
    }
  }, [data.motivo, interactive, motivoFontSize, onMotivoFontSizeChange]);

  const handleSelectSuggestion = (item: ReferenceItem) => {
    onChange?.({ ref: item.ref, pecas: item.peca });
    setDropdownOpen(false);
    setActiveIndex(-1);
  };

  const handleRefKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setActiveIndex(-1);
    }
  };

  const suffix = id === 'bloco1' ? '1' : '2';

  return (
    <div id={id} className="a5-container">
      {/* Header logo */}
      <div className="flex justify-start items-center mb-[6mm]">
        <img
          src={trigoLogo}
          alt="TRIGO Global Quality Solutions"
          className="h-[42px] max-w-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* STOP Octagon Box */}
      <div
        className="mx-auto mb-[8mm] w-full max-w-[9.5cm] h-[5.2cm] flex flex-col justify-center items-center text-center p-[15px]"
        style={{ border: '2px dashed #333333' }}
      >
        <div className="stop-sign-octagon">
          <span className="text-black text-[26px] font-bold leading-none select-none">
            STOP
          </span>
        </div>
        <div
          className="text-[22px] font-bold mt-[5px] leading-tight select-none"
          style={{ color: '#ffdc00' }}
        >
          NÃO USAR
        </div>
      </div>

      {/* Ref. with Autocomplete */}
      <div className="flex items-end mb-[5mm] w-full relative">
        <label
          htmlFor={`ref_${suffix}`}
          className="text-[18px] font-bold text-black mr-[8px] whitespace-nowrap pb-[2px]"
        >
          Ref.:
        </label>
        <div ref={autocompleteRef} className="flex-1 relative">
          <input
            id={`ref_${suffix}`}
            type="text"
            autoComplete="off"
            value={data.ref}
            readOnly={!interactive}
            onFocus={() => {
              if (interactive && data.ref.trim().length > 0) {
                setDropdownOpen(true);
              }
            }}
            onChange={(e) => {
              onChange?.({ ref: e.target.value });
              setDropdownOpen(e.target.value.trim().length > 0);
              setActiveIndex(-1);
            }}
            onKeyDown={handleRefKeyDown}
            className="w-full border-0 border-b-2 border-black text-[18px] font-bold py-[2px] px-[5px] bg-transparent outline-none text-black text-center"
          />

          {interactive && dropdownOpen && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="no-print absolute top-full left-0 right-0 bg-white border border-slate-300 max-h-[220px] overflow-y-auto z-50 shadow-lg mt-[2px] list-none p-0 m-0"
            >
              {suggestions.map((item, idx) => (
                <li
                  key={item.ref}
                  role="option"
                  aria-selected={idx === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  className={`px-3 py-2 cursor-pointer text-left border-b border-slate-100 last:border-b-0 flex items-center justify-between gap-2 text-[14px] transition-colors ${
                    idx === activeIndex
                      ? 'bg-[#ffdc00] text-black'
                      : 'text-slate-800 hover:bg-[#ffdc00]/60'
                  }`}
                >
                  <span className="font-bold whitespace-nowrap">{item.ref}</span>
                  {item.peca && (
                    <span className="text-[12px] text-slate-600 truncate">
                      {item.peca}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Peças */}
      <div className="flex items-end mb-[5mm] w-full">
        <label
          htmlFor={`pecas_${suffix}`}
          className="text-[18px] font-bold text-black mr-[8px] whitespace-nowrap pb-[2px]"
        >
          Peças:
        </label>
        <input
          id={`pecas_${suffix}`}
          type="text"
          value={data.pecas}
          readOnly={!interactive}
          onChange={(e) => onChange?.({ pecas: e.target.value })}
          className="flex-1 w-full border-0 border-b-2 border-black text-[18px] font-bold py-[2px] px-[5px] bg-transparent outline-none text-black text-center"
        />
      </div>

      {/* Qtd + Data */}
      <div className="flex items-end mb-[5mm] w-full">
        <label
          htmlFor={`quantidade_${suffix}`}
          className="text-[18px] font-bold text-black mr-[8px] whitespace-nowrap pb-[2px]"
        >
          Qtd:
        </label>
        <input
          id={`quantidade_${suffix}`}
          type="text"
          value={data.quantidade}
          readOnly={!interactive}
          onChange={(e) => onChange?.({ quantidade: e.target.value })}
          className="w-[80px] shrink-0 border-0 border-b-2 border-black text-[18px] font-bold py-[2px] px-[5px] bg-transparent outline-none text-black text-center"
        />
        <label
          htmlFor={`data_${suffix}`}
          className="text-[18px] font-bold text-black ml-[20px] mr-[8px] whitespace-nowrap pb-[2px]"
        >
          Data:
        </label>
        <input
          id={`data_${suffix}`}
          type="text"
          value={data.data}
          readOnly={!interactive}
          onChange={(e) => onChange?.({ data: e.target.value })}
          className="flex-1 w-full border-0 border-b-2 border-black text-[18px] font-bold py-[2px] px-[5px] bg-transparent outline-none text-black text-center"
        />
      </div>

      {/* Resp. */}
      <div className="flex items-end mb-[5mm] w-full">
        <label
          htmlFor={`responsavel_${suffix}`}
          className="text-[18px] font-bold text-black mr-[8px] whitespace-nowrap pb-[2px]"
        >
          Resp.:
        </label>
        <select
          id={`responsavel_${suffix}`}
          required
          value={data.responsavel}
          disabled={!interactive}
          onChange={(e) => onChange?.({ responsavel: e.target.value })}
          style={{ textAlignLast: 'center' }}
          className={`stop-select-print flex-1 w-full border-0 border-b-2 border-black text-[16px] font-bold py-[2px] px-[5px] bg-transparent outline-none text-black cursor-pointer ${
            data.responsavel === '' ? 'stop-select-empty' : ''
          }`}
        >
          <option value="">Selecionar Responsável</option>
          {RESPONSAVEIS.map((resp) => (
            <option key={resp} value={resp}>
              {resp}
            </option>
          ))}
        </select>
      </div>

      {/* Motivo */}
      <div className="flex flex-col mb-[5mm] w-full">
        <label
          htmlFor={`motivo_${suffix}`}
          className="text-[18px] font-bold text-black mb-[5px]"
        >
          Motivo:
        </label>
        <textarea
          ref={motivoRef}
          id={`motivo_${suffix}`}
          value={data.motivo}
          readOnly={!interactive}
          onChange={(e) => onChange?.({ motivo: e.target.value })}
          style={{ fontSize: `${motivoFontSize}px` }}
          className="w-full border-0 border-b-2 border-black font-bold resize-none outline-none bg-transparent text-center h-[45px] text-black leading-tight"
        />
      </div>

      {/* Obs. */}
      <div className="flex flex-col mb-[5mm] w-full">
        <label
          htmlFor={`observacoes_${suffix}`}
          className="text-[18px] font-bold text-black mb-[5px]"
        >
          Obs.:
        </label>
        <textarea
          ref={obsRef}
          id={`observacoes_${suffix}`}
          value={data.observacoes}
          readOnly={!interactive}
          onChange={(e) => onChange?.({ observacoes: e.target.value })}
          className="w-full border-0 border-b-2 border-black text-[16px] font-bold resize-none outline-none bg-transparent text-center h-[45px] text-black leading-tight"
        />
      </div>
    </div>
  );
};

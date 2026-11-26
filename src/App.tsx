import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  Columns2,
  Eraser,
  Printer,
  Settings,
  WifiOff,
  X,
} from 'lucide-react';
import { DatabaseModal } from './components/DatabaseModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { StopLabelCard } from './components/StopLabelCard.tsx';
import seedReferencesData from './data/referencias.json';
import { useAppUpdate } from './hooks/useAppUpdate.ts';
import {
  formatTodayPt,
  type ReferenceItem,
  type StopLabelData,
} from './types.ts';
import {
  loadOrSeedStaticRefs,
  replaceCachedRefs,
} from './utils/indexedDb.ts';

const SEED_REFERENCES: ReferenceItem[] = Array.isArray(seedReferencesData)
  ? (seedReferencesData as ReferenceItem[])
  : [];

interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

function createInitialLabel(): StopLabelData {
  return {
    ref: '',
    pecas: '',
    quantidade: '',
    data: formatTodayPt(),
    responsavel: '',
    motivo: '',
    observacoes: '',
  };
}

export default function App() {
  const [labelData, setLabelData] = useState<StopLabelData>(createInitialLabel);
  const [motivoFontSize, setMotivoFontSize] = useState<number>(24);
  const [labelData2, setLabelData2] = useState<StopLabelData>(createInitialLabel);
  const [motivoFontSize2, setMotivoFontSize2] = useState<number>(24);
  const [differentCards, setDifferentCards] = useState<boolean>(false);
  const [activeCard, setActiveCard] = useState<1 | 2>(1);
  const [previewDual, setPreviewDual] = useState<boolean>(false);

  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [loadingRefs, setLoadingRefs] = useState<boolean>(true);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(false);
  const [dbOpen, setDbOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (text: string, tone: ToastMessage['tone'] = 'info') => {
      const id = Date.now();
      setToast({ id, text, tone });
      window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 4500);
    },
    []
  );

  const loadReferences = useCallback(async () => {
    try {
      const res = await fetch('/api/references', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = await res.json();
      const items: ReferenceItem[] = Array.isArray(payload.items)
        ? payload.items
        : [];
      setBackendAvailable(true);
      setReferences(items);
      await replaceCachedRefs(items);
    } catch {
      setBackendAvailable(false);
      const localItems = await loadOrSeedStaticRefs(SEED_REFERENCES);
      setReferences(localItems);
    } finally {
      setLoadingRefs(false);
    }
  }, []);

  useEffect(() => {
    void loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const {
    checking: checkingUpdate,
    installing: installingUpdate,
    updateAvailable,
    currentVersion,
    checkForUpdates,
    installUpdate,
    dismissUpdate,
  } = useAppUpdate(loadReferences);

  const handleUpdateButtonClick = async () => {
    if (updateAvailable) {
      await installUpdate();
      return;
    }

    const result = await checkForUpdates(false);
    if (result.hasUpdate) {
      showToast(
        'Nova atualização encontrada! Clique em "Instalar Atualização" para aplicar.',
        'info'
      );
    } else if (result.reason === 'offline') {
      showToast(
        'Sem ligação à rede para verificar atualizações.',
        'error'
      );
    } else {
      showToast(
        `A aplicação já está na versão mais recente (v${result.version ?? currentVersion}).`,
        'success'
      );
    }
  };

  const handleLabelChange = useCallback((patch: Partial<StopLabelData>) => {
    setLabelData((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleLabel2Change = useCallback((patch: Partial<StopLabelData>) => {
    setLabelData2((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleClearForm = () => {
    setLabelData(createInitialLabel());
    setMotivoFontSize(24);
    setLabelData2(createInitialLabel());
    setMotivoFontSize2(24);
  };

  const handleAddReference = async (
    item: ReferenceItem
  ): Promise<{ ok: boolean; error?: string }> => {
    const trimmedRef = item.ref.trim();
    const trimmedPeca = item.peca.trim();
    if (!trimmedRef) {
      return { ok: false, error: 'O campo Referência é obrigatório.' };
    }

    if (!backendAvailable) {
      const exists = references.some(
        (entry) => entry.ref.toLowerCase() === trimmedRef.toLowerCase()
      );
      if (exists) {
        return {
          ok: false,
          error: `A referência "${trimmedRef}" já existe na base de dados.`,
        };
      }
      const created: ReferenceItem = { ref: trimmedRef, peca: trimmedPeca };
      const next = [created, ...references];
      setReferences(next);
      await replaceCachedRefs(next);
      showToast(`Referência ${created.ref} adicionada.`, 'success');
      return { ok: true };
    }

    try {
      const res = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: trimmedRef, peca: trimmedPeca }),
      });
      const payload = await res.json();
      if (!res.ok) {
        return { ok: false, error: payload?.error || 'Erro ao adicionar.' };
      }
      const next = [payload.item as ReferenceItem, ...references];
      setReferences(next);
      await replaceCachedRefs(next);
      showToast(`Referência ${trimmedRef} adicionada.`, 'success');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de ligação ao servidor.' };
    }
  };

  const handleUpdateReference = async (
    originalRef: string,
    updated: ReferenceItem
  ): Promise<{ ok: boolean; error?: string }> => {
    const nextRef = updated.ref.trim();
    const nextPeca = updated.peca.trim();
    if (!nextRef) {
      return { ok: false, error: 'A referência não pode ficar vazia.' };
    }

    if (!backendAvailable) {
      const collision = references.some(
        (entry) =>
          entry.ref.toLowerCase() !== originalRef.toLowerCase() &&
          entry.ref.toLowerCase() === nextRef.toLowerCase()
      );
      if (collision) {
        return {
          ok: false,
          error: `Já existe outra entrada com a referência "${nextRef}".`,
        };
      }
      const next = references.map((entry) =>
        entry.ref.toLowerCase() === originalRef.toLowerCase()
          ? { ref: nextRef, peca: nextPeca }
          : entry
      );
      setReferences(next);
      await replaceCachedRefs(next);
      showToast(`Referência ${nextRef} atualizada.`, 'success');
      return { ok: true };
    }

    try {
      const res = await fetch(
        `/api/references/${encodeURIComponent(originalRef)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: nextRef, peca: nextPeca }),
        }
      );
      const payload = await res.json();
      if (!res.ok) {
        return { ok: false, error: payload?.error || 'Erro ao atualizar.' };
      }
      const next = references.map((entry) =>
        entry.ref.toLowerCase() === originalRef.toLowerCase()
          ? (payload.item as ReferenceItem)
          : entry
      );
      setReferences(next);
      await replaceCachedRefs(next);
      showToast(`Referência ${nextRef} atualizada.`, 'success');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de ligação ao servidor.' };
    }
  };

  const handleDeleteReference = async (
    ref: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!backendAvailable) {
      const next = references.filter(
        (entry) => entry.ref.toLowerCase() !== ref.toLowerCase()
      );
      setReferences(next);
      await replaceCachedRefs(next);
      showToast(`Referência ${ref} removida.`, 'info');
      return { ok: true };
    }

    try {
      const res = await fetch(`/api/references/${encodeURIComponent(ref)}`, {
        method: 'DELETE',
      });
      const payload = await res.json();
      if (!res.ok) {
        showToast(payload?.error || 'Erro ao remover referência.', 'error');
        return { ok: false, error: payload?.error };
      }
      const next = references.filter(
        (entry) => entry.ref.toLowerCase() !== ref.toLowerCase()
      );
      setReferences(next);
      await replaceCachedRefs(next);
      showToast(`Referência ${ref} removida.`, 'info');
      return { ok: true };
    } catch {
      showToast('Erro de ligação ao servidor.', 'error');
      return { ok: false, error: 'Erro de ligação.' };
    }
  };

  const handleApplyToLabel = (item: ReferenceItem) => {
    if (differentCards && activeCard === 2) {
      setLabelData2((prev) => ({
        ...prev,
        ref: item.ref,
        pecas: item.peca,
      }));
      setDbOpen(false);
      showToast(`Referência ${item.ref} aplicada ao Cartão 2.`, 'success');
      return;
    }

    setLabelData((prev) => ({
      ...prev,
      ref: item.ref,
      pecas: item.peca,
    }));
    setDbOpen(false);
    showToast(
      differentCards
        ? `Referência ${item.ref} aplicada ao Cartão 1.`
        : `Referência ${item.ref} aplicada à etiqueta.`,
      'success'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f4f6] text-slate-900 print:bg-white">
      {/* Top Bar (hidden on print) */}
      <header className="no-print bg-white border-b border-slate-200 px-3 py-3">
        <div className="w-full max-w-[14cm] mx-auto grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleClearForm}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#d61c1c] hover:bg-[#b91616] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eraser className="w-4 h-4 shrink-0" />
            <span>Limpar</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              updateAvailable
                ? 'bg-[#ffdc00] text-black border-amber-500 hover:bg-[#f2d000]'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Definições</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col items-center px-3 py-5 print:p-0">

        {/* Startup / Update Available Banner */}
        {updateAvailable && (
          <div
            role="alert"
            className="no-print mb-4 px-4 py-3 rounded-lg border border-amber-400 bg-amber-50 text-slate-900 flex flex-wrap items-center justify-between gap-3 shadow-sm max-w-[14cm] lg:max-w-3xl w-full"
          >
            <div className="flex items-center gap-2.5 text-sm">
              <ArrowDownToLine className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="font-medium">
                Nova atualização disponível para a aplicação. Deseja instalar agora?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={installUpdate}
                disabled={installingUpdate}
                className="px-3.5 py-1.5 text-xs font-bold bg-[#034263] text-white hover:bg-[#02334d] rounded-md transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {installingUpdate ? 'A instalar...' : 'Instalar agora'}
              </button>
              <button
                type="button"
                onClick={dismissUpdate}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-amber-100 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                Mais tarde
              </button>
            </div>
          </div>
        )}

        {/* Offline Banner */}
        {!isOnline && (
          <div className="no-print mb-4 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium flex items-center gap-2 max-w-[14cm] lg:max-w-3xl w-full">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Sem ligação à internet — a trabalhar em modo offline com os dados guardados localmente.
            </span>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div
            role="status"
            className={`no-print mb-4 px-4 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-3 shadow-sm max-w-[14cm] w-full justify-between ${
              toast.tone === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : toast.tone === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Fechar notificação"
              className="text-current opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mode Tick Box: 2 Different Cards vs 2 Identical Cards */}
        <div className="no-print mb-4 w-full max-w-[14cm] mx-auto">
          <label
            htmlFor="different-cards-toggle"
            className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer select-none hover:bg-slate-50 transition-colors"
          >
            <span className="inline-flex items-center gap-2.5">
              <input
                id="different-cards-toggle"
                type="checkbox"
                checked={differentCards}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDifferentCards(checked);
                  if (!checked) {
                    setActiveCard(1);
                  }
                }}
                className="w-4 h-4 rounded border-slate-300 accent-[#034263] cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-900">
                Fazer 2 cartões diferentes
              </span>
            </span>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {differentCards ? 'Cartões independentes' : 'Imprime 2 iguais'}
            </span>
          </label>
        </div>

        {/* Print Page: Bloco 1 + Bloco 2 (identical mirror when unticked, independent editable when ticked) */}
        <div className="print-page flex flex-col xl:flex-row print:flex-row gap-6 xl:gap-[10mm] print:gap-[10mm] justify-center items-center xl:items-start print:items-center w-full">
          <div
            className="flex flex-col items-center max-w-full"
            onFocusCapture={() => setActiveCard(1)}
            onClick={() => setActiveCard(1)}
          >
            {differentCards && (
              <div className="no-print mb-2 w-full flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700">
                  Cartão 1
                </span>
                {activeCard === 1 && (
                  <span className="text-xs font-medium text-[#034263]">
                    Selecionado
                  </span>
                )}
              </div>
            )}
            <StopLabelCard
              id="bloco1"
              data={labelData}
              motivoFontSize={motivoFontSize}
              references={references}
              interactive
              onChange={handleLabelChange}
              onMotivoFontSizeChange={setMotivoFontSize}
            />
          </div>

          <div
            className={`max-w-full ${
              differentCards || previewDual
                ? 'flex flex-col items-center'
                : 'hidden print:flex print:flex-col print:items-center'
            }`}
            onFocusCapture={() => {
              if (differentCards) setActiveCard(2);
            }}
            onClick={() => {
              if (differentCards) setActiveCard(2);
            }}
          >
            {differentCards && (
              <div className="no-print mb-2 w-full flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700">
                  Cartão 2
                </span>
                {activeCard === 2 && (
                  <span className="text-xs font-medium text-[#034263]">
                    Selecionado
                  </span>
                )}
              </div>
            )}
            <StopLabelCard
              id="bloco2"
              data={differentCards ? labelData2 : labelData}
              motivoFontSize={differentCards ? motivoFontSize2 : motivoFontSize}
              references={references}
              interactive={differentCards}
              onChange={differentCards ? handleLabel2Change : undefined}
              onMotivoFontSizeChange={
                differentCards ? setMotivoFontSize2 : undefined
              }
            />
          </div>
        </div>

        {/* Bottom Actions below STOP Card (hidden on print) */}
        <div className="no-print mt-5 w-full max-w-[14cm] mx-auto grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={differentCards}
            onClick={() => setPreviewDual((prev) => !prev)}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg border transition-colors whitespace-nowrap ${
              differentCards
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : previewDual
                  ? 'bg-slate-900 text-white border-slate-900 cursor-pointer'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50 cursor-pointer'
            }`}
            title={
              differentCards
                ? 'Os 2 cartões diferentes já estão visíveis'
                : 'Alternar pré-visualização das 2 etiquetas A5 por página'
            }
          >
            <Columns2 className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {differentCards
                ? '2 Cartões Visíveis'
                : previewDual
                  ? 'Vista Simples'
                  : 'Pré-visualizar A4 (2x)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#034263] hover:bg-[#02334d] rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Imprimir</span>
          </button>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        referencesCount={references.length}
        currentVersion={currentVersion}
        updateAvailable={updateAvailable}
        checkingUpdate={checkingUpdate}
        installingUpdate={installingUpdate}
        onClose={() => setSettingsOpen(false)}
        onOpenDatabase={() => setDbOpen(true)}
        onCheckOrInstallUpdate={handleUpdateButtonClick}
      />

      {/* Database Management Modal */}
      <DatabaseModal
        open={dbOpen}
        references={references}
        loading={loadingRefs}
        onClose={() => setDbOpen(false)}
        onAdd={handleAddReference}
        onUpdate={handleUpdateReference}
        onDelete={handleDeleteReference}
        onApplyToLabel={handleApplyToLabel}
      />
    </div>
  );
}

import React, { useEffect } from 'react';
import {
  ArrowDownToLine,
  ChevronRight,
  Database,
  RefreshCw,
  X,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface SettingsModalProps {
  open: boolean;
  referencesCount: number;
  currentVersion: string;
  updateAvailable: boolean;
  checkingUpdate: boolean;
  installingUpdate: boolean;
  onClose: () => void;
  onOpenDatabase: () => void;
  onCheckOrInstallUpdate: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  referencesCount,
  currentVersion,
  updateAvailable,
  checkingUpdate,
  installingUpdate,
  onClose,
  onOpenDatabase,
  onCheckOrInstallUpdate,
}) => {
  const { isInstallable, isInstalled, isIOS } = usePWAInstall();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const showInstallSection = !isInstalled && (isInstallable || isIOS);

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2
              id="settings-modal-title"
              className="font-display text-base font-bold text-slate-900"
            >
              Definições
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
              Versão {currentVersion}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar definições"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings List */}
        <div className="divide-y divide-slate-200">
          {/* Base de Dados */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDatabase();
            }}
            className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 text-[#034263] shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  Base de Dados
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
                  {referencesCount.toLocaleString('pt-PT')} referências · Adicionar, editar ou remover
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Atualizações */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 text-[#034263] shrink-0">
                {updateAvailable ? (
                  <ArrowDownToLine className="w-5 h-5 text-amber-600" />
                ) : (
                  <RefreshCw
                    className={`w-5 h-5 ${checkingUpdate ? 'animate-spin' : ''}`}
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {updateAvailable
                    ? 'Atualização disponível'
                    : 'Atualizações da aplicação'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {updateAvailable
                    ? 'Nova versão pronta a instalar.'
                    : 'Verificar se existem novas versões.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onCheckOrInstallUpdate}
              disabled={checkingUpdate || installingUpdate}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                updateAvailable
                  ? 'bg-[#ffdc00] text-black border border-amber-500 hover:bg-[#f2d000]'
                  : 'bg-[#034263] text-white hover:bg-[#02334d]'
              }`}
            >
              {updateAvailable ? (
                <span>
                  {installingUpdate
                    ? 'A instalar...'
                    : 'Instalar Atualização'}
                </span>
              ) : (
                <span>
                  {checkingUpdate ? 'A verificar...' : 'Atualizar'}
                </span>
              )}
            </button>
          </div>

          {/* Instalar PWA (when supported) */}
          {showInstallSection && (
            <div className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  Instalar no dispositivo
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Aceder diretamente a partir do ecrã inicial.
                </div>
              </div>
              <PWAInstallButton />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

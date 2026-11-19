import React, { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
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
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installingApp, setInstallingApp] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowInstallGuide(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleInstallAppClick = async () => {
    if (isInstallable) {
      setInstallingApp(true);
      try {
        const accepted = await install();
        if (!accepted) {
          setShowInstallGuide(true);
        }
      } finally {
        setInstallingApp(false);
      }
    } else {
      setShowInstallGuide((prev) => !prev);
    }
  };

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

          {/* Instalar Aplicação */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 text-[#034263] shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    Instalar Aplicação
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isInstalled
                      ? 'A aplicação já está instalada neste dispositivo.'
                      : 'Adicionar ao ecrã inicial para acesso rápido e offline.'}
                  </div>
                </div>
              </div>

              {isInstalled ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Instalada</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallAppClick}
                  disabled={installingApp}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5 text-[#034263]" />
                  <span>{installingApp ? 'A instalar...' : 'Instalar App'}</span>
                </button>
              )}
            </div>

            {showInstallGuide && !isInstalled && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
                {isIOS ? (
                  <>
                    <p className="font-semibold text-slate-900">
                      Como instalar no iPhone / iPad (Safari):
                    </p>
                    <p>
                      1. Toque no botão <strong>Partilhar</strong> na barra inferior do Safari.
                    </p>
                    <p>
                      2. Selecione <strong>Adicionar ao ecrã principal</strong> e confirme em <strong>Adicionar</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-900">
                      Como instalar neste navegador:
                    </p>
                    <p>
                      Abra o menu do navegador (<strong>⋮</strong> ou ícone de instalação na barra de endereço) e selecione <strong>Instalar aplicação</strong> ou <strong>Adicionar ao ecrã inicial</strong>.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

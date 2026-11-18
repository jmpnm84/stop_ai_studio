import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { ReferenceItem } from '../types.ts';

interface DatabaseModalProps {
  open: boolean;
  references: ReferenceItem[];
  loading: boolean;
  onClose: () => void;
  onAdd: (item: ReferenceItem) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (
    originalRef: string,
    updated: ReferenceItem
  ) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (ref: string) => Promise<{ ok: boolean; error?: string }>;
  onApplyToLabel: (item: ReferenceItem) => void;
}

const PAGE_SIZE = 50;

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  open,
  references,
  loading,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  onApplyToLabel,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Add new item state
  const [newRef, setNewRef] = useState('');
  const [newPeca, setNewPeca] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Dynamic inline editing state
  const [editingOriginalRef, setEditingOriginalRef] = useState<string | null>(null);
  const [editRefValue, setEditRefValue] = useState('');
  const [editPecaValue, setEditPecaValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Inline delete confirmation state
  const [confirmDeleteRef, setConfirmDeleteRef] = useState<string | null>(null);
  const [deletingRef, setDeletingRef] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingOriginalRef) {
          setEditingOriginalRef(null);
          setEditError(null);
        } else if (confirmDeleteRef) {
          setConfirmDeleteRef(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, editingOriginalRef, confirmDeleteRef, onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return references;
    return references.filter(
      (item) =>
        item.ref.toLowerCase().includes(q) ||
        item.peca.toLowerCase().includes(q)
    );
  }, [references, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const visibleItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (!open) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRef = newRef.trim();
    const trimmedPeca = newPeca.trim();
    if (!trimmedRef) {
      setAddError('Introduza o código de referência.');
      return;
    }
    setAdding(true);
    setAddError(null);
    const result = await onAdd({ ref: trimmedRef, peca: trimmedPeca });
    setAdding(false);
    if (result.ok) {
      setNewRef('');
      setNewPeca('');
      setSearch('');
      setPage(1);
    } else {
      setAddError(result.error ?? 'Não foi possível adicionar a referência.');
    }
  };

  const startEditing = (item: ReferenceItem) => {
    setConfirmDeleteRef(null);
    setEditingOriginalRef(item.ref);
    setEditRefValue(item.ref);
    setEditPecaValue(item.peca);
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingOriginalRef(null);
    setEditError(null);
  };

  const commitEdit = async () => {
    if (!editingOriginalRef) return;
    const trimmedRef = editRefValue.trim();
    const trimmedPeca = editPecaValue.trim();
    if (!trimmedRef) {
      setEditError('A referência não pode ficar vazia.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    const result = await onUpdate(editingOriginalRef, {
      ref: trimmedRef,
      peca: trimmedPeca,
    });
    setSavingEdit(false);
    if (result.ok) {
      setEditingOriginalRef(null);
    } else {
      setEditError(result.error ?? 'Erro ao guardar alteração.');
    }
  };

  const handleDeleteConfirm = async (ref: string) => {
    setDeletingRef(ref);
    await onDelete(ref);
    setDeletingRef(null);
    setConfirmDeleteRef(null);
  };

  const handleExportCsv = () => {
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = [
      'Ref;Peca',
      ...filtered.map((item) => `${escapeCsv(item.ref)};${escapeCsv(item.peca)}`),
    ];
    const blob = new Blob(['\uFEFF' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trigo-stop-referencias.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white">
          <div className="min-w-0">
            <h2
              id="db-modal-title"
              className="font-display text-lg font-bold text-slate-900 tracking-tight"
            >
              Base de Dados de Referências
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="font-mono-tabular font-medium text-slate-700">
                {references.length.toLocaleString('pt-PT')} referências
              </span>
              <span aria-hidden="true">·</span>
              <span>Base local editável</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar base de dados"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Quick-Add Bar */}
        <form
          onSubmit={handleAddSubmit}
          className="px-6 py-3.5 bg-slate-50 border-b border-slate-200"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="sm:w-56">
              <label htmlFor="add-ref-input" className="sr-only">
                Nova Referência
              </label>
              <input
                id="add-ref-input"
                type="text"
                placeholder="Nova Referência (ex: 320100858R)"
                value={newRef}
                onChange={(e) => {
                  setNewRef(e.target.value);
                  if (addError) setAddError(null);
                }}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#034263]/30 focus:border-[#034263]"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="add-peca-input" className="sr-only">
                Descrição da Peça
              </label>
              <input
                id="add-peca-input"
                type="text"
                placeholder="Designação da Peça (ex: BVM ASS JT 006)"
                value={newPeca}
                onChange={(e) => setNewPeca(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#034263]/30 focus:border-[#034263]"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#034263] hover:bg-[#02334d] rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{adding ? 'A adicionar...' : 'Adicionar'}</span>
            </button>
          </div>
          {addError && (
            <p className="text-xs font-medium text-red-600 mt-2">{addError}</p>
          )}
        </form>

        {/* Search & Filter Row */}
        <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por referência ou nome da peça..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#034263]/20 focus:border-[#034263]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar pesquisa"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 font-mono-tabular">
            <span>
              {filtered.length === references.length
                ? `${references.length.toLocaleString('pt-PT')} itens`
                : `${filtered.length.toLocaleString('pt-PT')} de ${references.length.toLocaleString('pt-PT')} encontrados`}
            </span>
            <span className="hidden sm:inline text-slate-400">
              Duplo clique numa linha para editar
            </span>
          </div>
        </div>

        {/* Inline Edit Error Banner */}
        {editError && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-xs font-medium text-red-700 flex items-center justify-between">
            <span>{editError}</span>
            <button
              type="button"
              onClick={() => setEditError(null)}
              className="text-red-500 hover:text-red-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-2.5">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 bg-slate-100 rounded-md animate-pulse"
                />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                Nenhuma referência encontrada
                {search ? ` para "${search}"` : ''}.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Adicione uma nova referência acima ou ajuste os termos de pesquisa.
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-4 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Limpar pesquisa
                </button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr>
                  <th className="py-2.5 px-6 text-xs font-semibold text-slate-600 w-52">
                    Referência
                  </th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-slate-600">
                    Peça / Descrição
                  </th>
                  <th className="py-2.5 px-6 text-xs font-semibold text-slate-600 text-right w-56">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const isEditing = editingOriginalRef === item.ref;
                  const isConfirmingDelete = confirmDeleteRef === item.ref;

                  return (
                    <tr
                      key={item.ref}
                      onDoubleClick={() => {
                        if (!isEditing) startEditing(item);
                      }}
                      className={`transition-colors ${
                        isEditing
                          ? 'bg-amber-50/60'
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      <td className="py-2 px-6 align-middle">
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editRefValue}
                            onChange={(e) => setEditRefValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitEdit();
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-sm font-mono-tabular font-medium bg-white border border-[#034263] rounded-md focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono-tabular text-sm font-semibold text-slate-900">
                            {item.ref}
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-4 align-middle">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPecaValue}
                            onChange={(e) => setEditPecaValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitEdit();
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-sm bg-white border border-[#034263] rounded-md focus:outline-none"
                          />
                        ) : (
                          <span className="text-sm text-slate-700">
                            {item.peca || (
                              <span className="text-slate-400 italic">
                                Sem descrição
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-6 align-middle text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={commitEdit}
                              disabled={savingEdit}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Guardar</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancelar</span>
                            </button>
                          </div>
                        ) : isConfirmingDelete ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteConfirm(item.ref)}
                              disabled={deletingRef === item.ref}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <span>
                                {deletingRef === item.ref
                                  ? 'A remover...'
                                  : 'Confirmar'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteRef(null)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onApplyToLabel(item)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-[#034263] hover:bg-[#034263]/10 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                              title="Preencher esta referência na etiqueta STOP"
                            >
                              Usar
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditing(item)}
                              aria-label={`Editar ${item.ref}`}
                              title="Editar referência"
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOriginalRef(null);
                                setConfirmDeleteRef(item.ref);
                              }}
                              aria-label={`Remover ${item.ref}`}
                              title="Remover referência"
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono-tabular">
            Página {safePage} de {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Página seguinte"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

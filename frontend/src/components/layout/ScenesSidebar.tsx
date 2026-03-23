"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import type { BankId, SceneFolder, SceneItem, SceneStatus } from "@/types/player";

const BANKS: BankId[] = [
  "A","B","C","D","E","F","G","H",
  "I","J","K","L","M","N","O","P",
];

const LOGO_PATH = "/logo.png";
const LOGO_ALT = "Logo";

type ScenesSidebarProps = {
  activeBank: BankId;
  activeSceneId: string | null;
  scenes: SceneItem[];
  folders: SceneFolder[];
  bankLogos?: Partial<Record<BankId, string>>;
  onBankChange(bank: BankId): void;
  onSceneSelect(sceneId: string): void;
  onSceneLabelChange?(sceneId: string, label: string): void;
  onFolderLabelChange?(folderId: string, label: string): void;
  onAddFolder?(): void;
  onAddSceneToFolder?(folderId: string): void;
  onRemoveScene?(sceneId: string): void;
  onRemoveFolder?(folderId: string): void;
};

export function ScenesSidebar(props: ScenesSidebarProps): React.ReactElement {
  const {
    activeBank,
    activeSceneId,
    scenes,
    folders,
    bankLogos,
    onBankChange,
    onSceneSelect,
    onSceneLabelChange,
    onFolderLabelChange,
    onAddFolder,
    onAddSceneToFolder,
    onRemoveScene,
    onRemoveFolder,
  } = props;

  const listRef = useRef<HTMLDivElement | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editingType, setEditingType] = useState<"scene" | "folder">("scene");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const filteredScenes = scenes.filter((s) => s.bankId === activeBank);
  const filteredFolders = folders.filter((f) => f.bankId === activeBank);
  const rootFolders = filteredFolders.filter((f) => f.parentId == null);

  const toggleFolder = useCallback((folderId: string): void => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const startEditingScene = useCallback((scene: SceneItem): void => {
    setEditingId(scene.id);
    setEditLabel(scene.label);
    setEditingType("scene");
  }, []);

  const startEditingFolder = useCallback((folder: SceneFolder): void => {
    setEditingId(folder.id);
    setEditLabel(folder.label);
    setEditingType("folder");
  }, []);

  const submitEdit = useCallback((): void => {
    if (editingId === null) return;
    const trimmed = editLabel.trim();
    if (trimmed.length > 0) {
      if (editingType === "scene" && onSceneLabelChange) {
        onSceneLabelChange(editingId, trimmed);
      } else if (editingType === "folder" && onFolderLabelChange) {
        onFolderLabelChange(editingId, trimmed);
      }
    }
    setEditingId(null);
  }, [editingId, editLabel, editingType, onSceneLabelChange, onFolderLabelChange]);

  const cancelEdit = useCallback((): void => {
    setEditingId(null);
  }, []);

  function indicatorClass(status: SceneStatus): string {
    return `scene-item-indicator scene-item-indicator--${status}`;
  }

  function renderEditInput(): React.ReactElement {
    return (
      <input
        type="text"
        className="scene-item-input"
        value={editLabel}
        onChange={(e): void => setEditLabel(e.target.value)}
        onBlur={submitEdit}
        onKeyDown={(e): void => {
          if (e.key === "Enter") submitEdit();
          if (e.key === "Escape") cancelEdit();
        }}
        aria-label="Renomear"
        autoFocus
      />
    );
  }

  /** Sub-cena dentro de uma pasta. */
  function renderChildScene(scene: SceneItem): React.ReactElement {
    const isActive = activeSceneId === scene.id;
    const isEditing = editingId === scene.id;
    return (
      <div
        key={scene.id}
        className={`scene-sub-item${isActive ? " scene-sub-item-active" : ""}`}
      >
        {isEditing ? (
          renderEditInput()
        ) : (
          <>
            <button
              type="button"
              className="scene-sub-item-btn"
              onClick={(): void => {
                onSceneSelect(scene.id);
                setActiveFolderId(scene.parentId ?? null);
              }}
              onDoubleClick={(): void => { if (onSceneLabelChange) startEditingScene(scene); }}
              title="Clique para selecionar; duplo clique para renomear"
            >
              {scene.label}
            </button>
            <span className={indicatorClass(scene.status)} aria-label={scene.status} title={scene.status} />
          </>
        )}
      </div>
    );
  }

  /** Pasta-raiz com toggle, sub-header de ações e sub-cenas. */
  function renderFolder(folder: SceneFolder): React.ReactElement {
    const isOpen = expandedFolders.has(folder.id);
    const isEditing = editingId === folder.id;
    const isActiveFolder = activeFolderId === folder.id;
    const childScenes = filteredScenes.filter((s) => s.parentId === folder.id);
    const childFolders = filteredFolders.filter((f) => f.parentId === folder.id);
    const activeChildId = childScenes.find((s) => s.id === activeSceneId)?.id ?? null;

    return (
      <div key={folder.id} className="scene-folder-group">
        {/* ── Cabeçalho da pasta ── */}
        <div
          className={`scene-item${isActiveFolder ? " scene-item-selected" : " scene-item-inactive"}${isOpen ? " scene-item-folder-open" : ""}`}
          role="listitem"
        >
          {isEditing ? (
            <>
              {renderEditInput()}
              <span className="scene-item-indicator scene-item-indicator--idle" aria-hidden />
            </>
          ) : (
            <>
              <button
                type="button"
                className="scene-item-label-btn"
                onClick={(): void => {
                  toggleFolder(folder.id);
                  setActiveFolderId(folder.id);
                }}
                onDoubleClick={(): void => { if (onFolderLabelChange) startEditingFolder(folder); }}
                title="Clique para expandir; duplo clique para renomear"
              >
                <span className="scene-item-label">{folder.label}</span>
              </button>
              <button
                type="button"
                className="scene-item-expand-btn"
                onClick={(): void => {
                  toggleFolder(folder.id);
                  setActiveFolderId(folder.id);
                }}
                title={isOpen ? "Recolher" : "Expandir"}
                aria-label={isOpen ? "Recolher" : "Expandir"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {isOpen ? (
                    <polyline points="18 15 12 9 6 15" />
                  ) : (
                    <polyline points="6 9 12 15 18 9" />
                  )}
                </svg>
              </button>
            </>
          )}
        </div>

        {/* ── Conteúdo expandido ── */}
        {isOpen && (
          <>
            {/* Barra de ações das sub-cenas — fora da área indentada */}
            <div className="scene-sub-list-header">
              <span className="scene-sub-list-header-title">Sub-cenas</span>
              <div className="scene-sub-list-header-actions">
                {onAddSceneToFolder != null && (
                  <button
                    type="button"
                    className="scene-sub-list-header-btn"
                    onClick={(): void => onAddSceneToFolder(folder.id)}
                    title="Adicionar sub-cena"
                  >
                    + Adicionar
                  </button>
                )}
                {onRemoveScene != null && activeChildId != null && (
                  <button
                    type="button"
                    className="scene-sub-list-header-btn scene-sub-list-header-btn-danger"
                    onClick={(): void => onRemoveScene(activeChildId)}
                    title="Excluir sub-cena selecionada"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>

            {/* Lista indentada de sub-cenas */}
            <div className="scene-sub-list">
              {childFolders.map((cf) => renderFolder(cf))}
              {childScenes.map((cs) => renderChildScene(cs))}
              {childScenes.length === 0 && childFolders.length === 0 && (
                <p className="scene-sub-list-empty">Nenhuma sub-cena</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <aside
      className="layout-sidebar-left scenes-sidebar glass-surface section-divider"
      aria-label="Cenas e bancos"
    >
      <div className="scenes-sidebar-body">
        {/* Logo MJC */}
        <div className="scenes-sidebar-logo">
          <div className="scenes-sidebar-logo-inner">
            {logoError ? (
              <span className="scenes-sidebar-logo-fallback">MJC</span>
            ) : (
              <Image
                src={LOGO_PATH}
                alt={LOGO_ALT}
                fill
                sizes="(max-width: 208px) 100vw, 208px"
                className="scenes-sidebar-logo-image"
                unoptimized
                onError={(): void => setLogoError(true)}
              />
            )}
          </div>
        </div>

        {/* Bancos A–P */}
        <div className="scenes-sidebar-banks">
          {BANKS.map((letter) => {
            const logoUrl = bankLogos?.[letter];
            return (
              <button
                key={letter}
                type="button"
                onClick={(): void => onBankChange(letter)}
                className={`scenes-sidebar-bank-btn ${activeBank === letter ? "bank-btn-active" : "btn-glass"}`}
                title={letter}
                aria-label={`Banco ${letter}`}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="scenes-sidebar-bank-logo" aria-hidden />
                ) : (
                  <span className="scenes-sidebar-bank-letter">{letter}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista de cenas */}
        <div ref={listRef} className="scenes-sidebar-list" role="list">
          {rootFolders.length === 0 ? (
            <p className="scenes-sidebar-list-empty">Banco {activeBank} vazio.</p>
          ) : (
            rootFolders.map((f) => renderFolder(f))
          )}

          {/* Footer: ações de cena (raiz) */}
          <div className="scenes-sidebar-list-footer">
            {onAddFolder != null && (
              <button
                type="button"
                className="scenes-sidebar-action-btn btn-glass"
                onClick={onAddFolder}
                title="Criar nova cena"
              >
                Nova cena
              </button>
            )}
            {onRemoveFolder != null && activeFolderId != null && (
              <button
                type="button"
                className="scenes-sidebar-action-btn scenes-sidebar-action-btn-danger"
                onClick={(): void => {
                  onRemoveFolder(activeFolderId);
                  setActiveFolderId(null);
                }}
                title="Excluir cena selecionada"
              >
                Excluir cena
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

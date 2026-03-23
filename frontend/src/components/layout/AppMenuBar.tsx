"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import type { PlaylistItem } from "@/types/player";

type AudioDeviceInfo = { deviceId: string; label: string };

type AppMenuBarProps = {
  onScan(): void;
  scanning: boolean;
  playlists: PlaylistItem[];
  currentPlaylistId: string | null;
  onSelectPlaylist(id: string | null): void;
  onCreatePlaylist(name: string): void;
  broadcastDeviceId: string;
  onBroadcastDeviceChange(deviceId: string): void;
  monitorDeviceId: string;
  onMonitorDeviceChange(deviceId: string): void;
};

const STATIC_MENUS = ["Editar", "Ferramentas", "Temas", "Log", "Ajuda"] as const;

export function AppMenuBar(props: AppMenuBarProps): React.ReactElement {
  const {
    onScan,
    scanning,
    playlists,
    currentPlaylistId,
    onSelectPlaylist,
    onCreatePlaylist,
    broadcastDeviceId,
    onBroadcastDeviceChange,
    monitorDeviceId,
    onMonitorDeviceChange,
  } = props;

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
  const [audioOutputs, setAudioOutputs] = useState<AudioDeviceInfo[]>([]);
  const navRef = useRef<HTMLDivElement>(null);

  /* Enumerar saídas de áudio quando Config abre */
  useEffect(() => {
    if (menuOpen !== "config") return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const outputs = devices
          .filter((d) => d.kind === "audiooutput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label.length > 0 ? d.label : `Saída ${i + 1}`,
          }));
        setAudioOutputs(outputs);
      })
      .catch(() => {});
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen === null && !playlistsOpen) return;
    const handleClickOutside = (e: MouseEvent): void => {
      if (navRef.current?.contains(e.target as Node) === false) {
        setMenuOpen(null);
        setPlaylistsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, playlistsOpen]);

  const handleCreatePlaylist = useCallback((): void => {
    const name = newPlaylistName.trim();
    if (name.length > 0) {
      onCreatePlaylist(name);
      setNewPlaylistName("");
      setShowNewPlaylistInput(false);
    }
  }, [newPlaylistName, onCreatePlaylist]);

  return (
    <div className="app-menubar" role="menubar" aria-label="Barra de menus">
      <nav className="app-menubar-nav" ref={navRef} aria-label="Menu principal">
        {/* Ficheiro */}
        <div className="app-menubar-item-wrap">
          <button
            type="button"
            className={`app-menubar-btn${menuOpen === "file" ? " app-menubar-btn-open" : ""}`}
            onClick={(): void => setMenuOpen(menuOpen === "file" ? null : "file")}
            aria-haspopup="menu"
            aria-expanded={menuOpen === "file"}
          >
            Ficheiro
          </button>
          {menuOpen === "file" && (
            <div className="app-menubar-dropdown" role="menu">
              <button
                type="button"
                className="app-menubar-dropdown-item"
                role="menuitem"
                disabled={scanning}
                onClick={(): void => { onScan(); setMenuOpen(null); }}
              >
                {scanning ? "Importando…" : "Importar faixas…"}
              </button>
              <button
                type="button"
                className="app-menubar-dropdown-item"
                role="menuitem"
              >
                Exportar playlist
              </button>
            </div>
          )}
        </div>

        {/* Playlists */}
        <div className="app-menubar-item-wrap">
          <button
            type="button"
            className={`app-menubar-btn${playlistsOpen ? " app-menubar-btn-open" : ""}`}
            onClick={(): void => setPlaylistsOpen(!playlistsOpen)}
            aria-haspopup="menu"
            aria-expanded={playlistsOpen}
          >
            Playlists
          </button>
          {playlistsOpen && (
            <div className="app-menubar-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                className={`app-menubar-dropdown-item${currentPlaylistId === null ? " app-menubar-dropdown-item-active" : ""}`}
                onClick={(): void => { onSelectPlaylist(null); setPlaylistsOpen(false); }}
              >
                Todas as playlists
              </button>
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  role="menuitem"
                  className={`app-menubar-dropdown-item${currentPlaylistId === pl.id ? " app-menubar-dropdown-item-active" : ""}`}
                  onClick={(): void => { onSelectPlaylist(pl.id); setPlaylistsOpen(false); }}
                >
                  {pl.name}
                </button>
              ))}
              <div className="app-menubar-dropdown-separator" role="separator" />
              {showNewPlaylistInput ? (
                <div className="app-menubar-new-playlist-form">
                  <input
                    type="text"
                    className="app-menubar-new-playlist-input"
                    value={newPlaylistName}
                    placeholder="Nome da playlist"
                    autoFocus
                    onChange={(e): void => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e): void => {
                      if (e.key === "Enter") handleCreatePlaylist();
                      if (e.key === "Escape") setShowNewPlaylistInput(false);
                    }}
                  />
                  <button
                    type="button"
                    className="app-menubar-new-playlist-ok"
                    onClick={handleCreatePlaylist}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="app-menubar-dropdown-item"
                  onClick={(): void => setShowNewPlaylistInput(true)}
                >
                  + Nova playlist
                </button>
              )}
            </div>
          )}
        </div>

        {/* Config */}
        <div className="app-menubar-item-wrap">
          <button
            type="button"
            className={`app-menubar-btn${menuOpen === "config" ? " app-menubar-btn-open" : ""}`}
            onClick={(): void => setMenuOpen(menuOpen === "config" ? null : "config")}
            aria-haspopup="menu"
            aria-expanded={menuOpen === "config"}
          >
            Config
          </button>
          {menuOpen === "config" && (
            <div className="app-menubar-dropdown app-menubar-dropdown-wide" role="menu">
              <span className="app-menubar-dropdown-label">Saída Live</span>
              {audioOutputs.length === 0 && (
                <span className="app-menubar-dropdown-empty">Nenhuma saída detectada</span>
              )}
              {audioOutputs.map((d) => (
                <button
                  key={`live-${d.deviceId}`}
                  type="button"
                  role="menuitem"
                  className={`app-menubar-dropdown-item${broadcastDeviceId === d.deviceId ? " app-menubar-dropdown-item-active" : ""}`}
                  onClick={(): void => { onBroadcastDeviceChange(d.deviceId); setMenuOpen(null); }}
                >
                  {d.label}
                </button>
              ))}
              <div className="app-menubar-dropdown-separator" role="separator" />
              <span className="app-menubar-dropdown-label">Saída Monitor</span>
              <button
                type="button"
                role="menuitem"
                className={`app-menubar-dropdown-item${monitorDeviceId === "none" ? " app-menubar-dropdown-item-active" : ""}`}
                onClick={(): void => { onMonitorDeviceChange("none"); setMenuOpen(null); }}
              >
                Desativado
              </button>
              {audioOutputs.map((d) => (
                <button
                  key={`mon-${d.deviceId}`}
                  type="button"
                  role="menuitem"
                  className={`app-menubar-dropdown-item${monitorDeviceId === d.deviceId ? " app-menubar-dropdown-item-active" : ""}`}
                  onClick={(): void => { onMonitorDeviceChange(d.deviceId); setMenuOpen(null); }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menus estáticos */}
        {STATIC_MENUS.map((label) => (
          <button key={label} type="button" className="app-menubar-btn">
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

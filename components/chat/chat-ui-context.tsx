"use client";

import { createContext, useContext } from "react";

// Jembatan kecil StudentNav (pemilik state sidebar) → ChatScreen (pemicu).
// ChatScreen memanggil markStarted() saat pesan pertama terkirim; StudentNav
// meresponnya dengan mengempiskan sidebar ke mode ikon (fokus percakapan).
export type ChatUI = {
  started: boolean;
  markStarted: () => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
};

const noop = () => {};
export const ChatUIContext = createContext<ChatUI>({
  started: false,
  markStarted: noop,
  collapsed: false,
  setCollapsed: noop,
});

export const useChatUI = () => useContext(ChatUIContext);

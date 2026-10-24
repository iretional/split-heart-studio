import { useCallback, useEffect, useRef, useState } from "react";
import { call_rpc, create_rpc_connection, type RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { connect as serialConnect } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";
import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import type { Keymap, PhysicalLayout } from "@zmkfirmware/zmk-studio-ts-client/keymap";

type Session = { connection: RpcConnection; transport: RpcTransport; abort: AbortController };

/** "no-port" is the Web Serial picker closing without a choice; it gets its own guidance in the UI. */
export type StudioError = { kind: "no-port" | "other"; message: string };

const toError = (e: unknown): StudioError => {
  if (e instanceof DOMException && e.name === "NotFoundError") return { kind: "no-port", message: e.message };
  return { kind: "other", message: e instanceof Error ? e.message : String(e) };
};

export function useStudio() {
  const session = useRef<Session | null>(null);
  const [device, setDevice] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(true);
  const [layouts, setLayouts] = useState<PhysicalLayout[]>([]);
  const [activeLayout, setActiveLayout] = useState(0);
  const [keymap, setKeymap] = useState<Keymap | null>(null);
  const [names, setNames] = useState<Record<number, string>>({});
  const [error, setError] = useState<StudioError | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const hasSerial = typeof navigator !== "undefined" && "serial" in navigator;
  const connected = session.current !== null && !!device;

  const disconnect = useCallback(() => {
    const old = session.current;
    session.current = null;
    old?.abort.abort("Disconnected");
    old?.transport.abortController.abort("Disconnected");
    setDevice(""); setLocked(true); setLayouts([]); setKeymap(null);
    setNames({}); setError(null);
  }, []);

  useEffect(() => () => {
    session.current?.abort.abort("Unmounted");
    session.current?.transport.abortController.abort("Unmounted");
    session.current = null;
  }, []);

  const refresh = useCallback(async (connection?: RpcConnection) => {
    const conn = connection ?? session.current?.connection;
    if (!conn) return;
    setLoading(true); setError(null);
    try {
      const state = await call_rpc(conn, { core: { getLockState: true } });
      const isLocked = state.core?.getLockState !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;
      if (session.current?.connection !== conn) return;
      setLocked(isLocked);
      if (isLocked) { setKeymap(null); setLayouts([]); return; }
      const layoutsResponse = await call_rpc(conn, { keymap: { getPhysicalLayouts: true } });
      const keymapResponse = await call_rpc(conn, { keymap: { getKeymap: true } });
      if (session.current?.connection !== conn) return;
      const layoutData = layoutsResponse.keymap?.getPhysicalLayouts;
      const mapData = keymapResponse.keymap?.getKeymap;
      if (!layoutData?.layouts?.length || !mapData?.layers?.length)
        throw new Error("키보드가 레이아웃 또는 키맵을 반환하지 않았습니다.");
      setLayouts(layoutData.layouts);
      setActiveLayout(layoutData.activeLayoutIndex ?? 0);
      setKeymap(mapData);
      setLastSync(new Date());
      // Metadata is optional: raw behavior IDs still work if a custom behavior lacks details.
      try {
        const response = await call_rpc(conn, { behaviors: { listAllBehaviors: true } });
        const ids = response.behaviors?.listAllBehaviors?.behaviors ?? [];
        const displayNames: Record<number, string> = {};
        for (const behaviorId of ids) {
          if (session.current?.connection !== conn) return;
          const detail = await call_rpc(conn, { behaviors: { getBehaviorDetails: { behaviorId } } });
          const value = detail.behaviors?.getBehaviorDetails;
          if (value) displayNames[value.id] = value.displayName || "Behavior #" + value.id;
        }
        if (session.current?.connection === conn) setNames(displayNames);
      } catch (err) { console.warn("Behavior metadata unavailable", err); }
    } catch (err) {
      if (session.current?.connection === conn) setError(toError(err));
    } finally {
      if (session.current?.connection === conn) setLoading(false);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!hasSerial || loading) return;
    setLoading(true); setError(null);
    let transport: RpcTransport | null = null;
    let abort: AbortController | null = null;
    try {
      transport = await serialConnect();
      abort = new AbortController();
      const connection = create_rpc_connection(transport, { signal: abort.signal });
      session.current = { connection, transport, abort };
      const result = await call_rpc(connection, { core: { getDeviceInfo: true } });
      if (!result.core?.getDeviceInfo) throw new Error("ZMK Studio RPC 연결에 실패했습니다.");
      setDevice(result.core.getDeviceInfo.name || "Split Heart");
      await refresh(connection);
    } catch (err) {
      abort?.abort("Connection failed");
      transport?.abortController.abort("Connection failed");
      session.current = null;
      setError(toError(err));
    } finally { setLoading(false); }
  }, [hasSerial, loading, refresh]);

  return {
    hasSerial, connected, device, loading, locked, error, lastSync,
    layout: layouts[activeLayout] as PhysicalLayout | undefined, keymap, names,
    connect, disconnect, refresh: () => void refresh(),
  };
}

export type Studio = ReturnType<typeof useStudio>;

import { useCallback, useEffect, useRef, useState } from "react";
import { call_rpc, create_rpc_connection, type RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { connect as serialConnect } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";
import { connect as gattConnect } from "@zmkfirmware/zmk-studio-ts-client/transport/gatt";
import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { SetLayerBindingResponse, SetLayerPropsResponse, type BehaviorBinding, type Keymap, type Layer, type PhysicalLayout } from "@zmkfirmware/zmk-studio-ts-client/keymap";

export type RemovedLayer = { layer: Layer; index: number };
export type Transport = "usb" | "bluetooth";

/** Display names ZMK ships with; any other behavior name is treated as a firmware macro. */
const BUILT_IN = /^(key press|transparent|none|momentary layer|layer.?tap|mod.?tap|toggle layer|to layer|sticky|caps word|key repeat|bootloader|reset|bluetooth|output|rgb|backlight|external power|grave|tap.?dance|mouse|studio unlock|soft off)/i;

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
  const [unsaved, setUnsaved] = useState(0);
  const [removed, setRemoved] = useState<RemovedLayer[]>([]);
  const [transport, setTransport] = useState<Transport>("usb");
  const hasSerial = typeof navigator !== "undefined" && "serial" in navigator;
  const hasBluetooth = typeof navigator !== "undefined" && "bluetooth" in navigator;
  const connected = session.current !== null && !!device;
  const keymapRef = useRef(keymap);
  keymapRef.current = keymap;

  const disconnect = useCallback(() => {
    const old = session.current;
    session.current = null;
    old?.abort.abort("Disconnected");
    old?.transport.abortController.abort("Disconnected");
    setDevice(""); setLocked(true); setLayouts([]); setKeymap(null);
    setNames({}); setError(null); setUnsaved(0); setRemoved([]);
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

  const connect = useCallback(async (kind: Transport = "usb") => {
    if (loading || !(kind === "usb" ? hasSerial : hasBluetooth)) return;
    setLoading(true); setError(null); setTransport(kind);
    let transport: RpcTransport | null = null;
    let abort: AbortController | null = null;
    try {
      transport = await (kind === "usb" ? serialConnect() : gattConnect());
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
  }, [hasSerial, hasBluetooth, loading, refresh]);

  /** Every edit stays in the keyboard's RAM until saveChanges, which is what the Save button sends. */
  const edit = useCallback(async (fn: (conn: RpcConnection) => Promise<void>) => {
    const conn = session.current?.connection;
    if (!conn) return;
    setError(null);
    try { await fn(conn); } catch (err) { setError(toError(err)); }
  }, []);
  const fail = (what: string): never => { throw new Error(what + "에 실패했습니다."); };

  const setBinding = useCallback((layerId: number, keyPosition: number, binding: BehaviorBinding) => edit(async conn => {
    const r = await call_rpc(conn, { keymap: { setLayerBinding: { layerId, keyPosition, binding } } });
    if (r.keymap?.setLayerBinding !== SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK) fail("키 변경");
    setKeymap(k => k && { ...k, layers: k.layers.map(l => l.id !== layerId ? l
      : { ...l, bindings: l.bindings.map((b, i) => i === keyPosition ? binding : b) }) });
    setUnsaved(n => n + 1);
  }), [edit]);

  const renameLayer = useCallback((layerId: number, name: string) => edit(async conn => {
    const r = await call_rpc(conn, { keymap: { setLayerProps: { layerId, name } } });
    if (r.keymap?.setLayerProps !== SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK) fail("이름 변경");
    setKeymap(k => k && { ...k, layers: k.layers.map(l => l.id === layerId ? { ...l, name } : l) });
    setUnsaved(n => n + 1);
  }), [edit]);

  const moveLayer = useCallback((startIndex: number, destIndex: number) => edit(async conn => {
    const r = await call_rpc(conn, { keymap: { moveLayer: { startIndex, destIndex } } });
    const ok = r.keymap?.moveLayer?.ok;
    if (!ok) return fail("레이어 이동");
    setKeymap(ok);
    setUnsaved(n => n + 1);
  }), [edit]);

  const addLayer = useCallback(() => edit(async conn => {
    const r = await call_rpc(conn, { keymap: { addLayer: {} } });
    const layer = r.keymap?.addLayer?.ok?.layer;
    if (!layer) return fail("레이어 추가");
    setKeymap(k => k && { ...k, availableLayers: k.availableLayers - 1, layers: [...k.layers, layer] });
    setUnsaved(n => n + 1);
  }), [edit]);

  const removeLayer = useCallback((layerIndex: number) => edit(async conn => {
    const r = await call_rpc(conn, { keymap: { removeLayer: { layerIndex } } });
    if (!r.keymap?.removeLayer?.ok) fail("레이어 삭제");
    const layer = keymapRef.current?.layers[layerIndex];
    if (layer) setRemoved(list => [...list, { layer, index: layerIndex }]);
    setKeymap(k => k && { ...k, availableLayers: k.availableLayers + 1, layers: k.layers.filter((_, i) => i !== layerIndex) });
    setUnsaved(n => n + 1);
  }), [edit]);

  const restoreLayer = useCallback((item: RemovedLayer) => edit(async conn => {
    const atIndex = Math.min(item.index, keymapRef.current?.layers.length ?? 0);
    const r = await call_rpc(conn, { keymap: { restoreLayer: { layerId: item.layer.id, atIndex } } });
    const layer = r.keymap?.restoreLayer?.ok;
    if (!layer) return fail("레이어 복원");
    setKeymap(k => { if (!k) return k; const layers = [...k.layers]; layers.splice(atIndex, 0, layer); return { ...k, availableLayers: k.availableLayers - 1, layers }; });
    setRemoved(list => list.filter(x => x !== item));
    setUnsaved(n => Math.max(0, n - 1));
  }), [edit]);

  const saveChanges = useCallback(() => edit(async conn => {
    const r = await call_rpc(conn, { keymap: { saveChanges: true } });
    if (!r.keymap?.saveChanges?.ok) fail("저장");
    setUnsaved(0); setRemoved([]); setLastSync(new Date());
  }), [edit]);

  const discardChanges = useCallback(() => edit(async conn => {
    await call_rpc(conn, { keymap: { discardChanges: true } });
    setUnsaved(0); setRemoved([]);
    await refresh(conn);
  }), [edit, refresh]);

  const setActiveLayoutIndex = useCallback((index: number) => edit(async conn => {
    const r = await call_rpc(conn, { keymap: { setActivePhysicalLayout: index } });
    const ok = r.keymap?.setActivePhysicalLayout?.ok;
    if (!ok) return fail("레이아웃 변경");
    setKeymap(ok); setActiveLayout(index); setUnsaved(n => n + 1);
  }), [edit]);

  const lock = useCallback(() => edit(async conn => {
    await call_rpc(conn, { core: { lock: true } });
    await refresh(conn);
  }), [edit, refresh]);

  const resetSettings = useCallback(() => edit(async conn => {
    const r = await call_rpc(conn, { core: { resetSettings: true } });
    if (!r.core?.resetSettings) fail("초기화");
    setUnsaved(0); setRemoved([]);
    await refresh(conn);
  }), [edit, refresh]);

  return {
    hasSerial, hasBluetooth, connected, device, loading, locked, error, lastSync, transport, unsaved, removed,
    firmware: "ZMK · Studio RPC",
    firmwareMacros: Object.values(names).filter(n => !BUILT_IN.test(n)),
    layouts, activeLayout, layout: layouts[activeLayout] as PhysicalLayout | undefined, keymap, names,
    connect, disconnect, refresh: () => void refresh(),
    setBinding, renameLayer, moveLayer, addLayer, removeLayer, restoreLayer, saveChanges, discardChanges,
    setActiveLayoutIndex, lock, resetSettings,
  };
}

export type Studio = ReturnType<typeof useStudio>;

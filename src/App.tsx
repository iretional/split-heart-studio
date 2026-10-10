import { useCallback, useEffect, useRef, useState } from "react";
import { call_rpc, create_rpc_connection, type RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { connect as serialConnect } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";
import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import type { Keymap, PhysicalLayout } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { bindingLabel } from "./keyLabels";

type Session = { connection: RpcConnection; transport: RpcTransport; abort: AbortController };
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e);

export default function App() {
  const session = useRef<Session | null>(null);
  const [device, setDevice] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(true);
  const [layouts, setLayouts] = useState<PhysicalLayout[]>([]);
  const [activeLayout, setActiveLayout] = useState(0);
  const [keymap, setKeymap] = useState<Keymap | null>(null);
  const [names, setNames] = useState<Record<number, string>>({});
  const [layerIndex, setLayerIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");
  const hasSerial = typeof navigator !== "undefined" && "serial" in navigator;
  const connected = session.current !== null && !!device;

  const disconnect = useCallback(() => {
    const old = session.current;
    session.current = null;
    old?.abort.abort("Disconnected");
    old?.transport.abortController.abort("Disconnected");
    setDevice(""); setLocked(true); setLayouts([]); setKeymap(null);
    setNames({}); setSelected(null); setLayerIndex(0); setError("");
  }, []);

  useEffect(() => () => {
    session.current?.abort.abort("Unmounted");
    session.current?.transport.abortController.abort("Unmounted");
    session.current = null;
  }, []);

  const refresh = useCallback(async (connection?: RpcConnection) => {
    const conn = connection ?? session.current?.connection;
    if (!conn) return;
    setLoading(true); setError("");
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
      setLayerIndex(0); setSelected(null);
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
      if (session.current?.connection === conn) setError(errorText(err));
    } finally {
      if (session.current?.connection === conn) setLoading(false);
    }
  }, []);

  async function connect() {
    if (!hasSerial || loading) return;
    setLoading(true); setError("");
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
      setError(errorText(err));
    } finally { setLoading(false); }
  }

  const layout = layouts[activeLayout];
  const currentLayer = keymap?.layers[layerIndex];
  const binding = selected === null ? null : currentLayer?.bindings[selected] ?? null;
  const chosen = binding ? bindingLabel(binding.behaviorId, binding.param1, binding.param2, names) : null;

  return <div className="app">
    <header className="header">
      <div className="brand"><span className="emblem">◇</span><div><strong>SPLIT HEART</strong><small>STUDIO  /  0.1 ALPHA</small></div></div>
      <div className="header-actions"><span className={"indicator" + (connected ? " online" : "")}>● {connected ? device : "DISCONNECTED"}</span>
        {connected
          ? <button onClick={disconnect} className="btn secondary">연결 해제</button>
          : <button onClick={() => void connect()} className="btn primary" disabled={!hasSerial || loading}>USB 연결</button>}
      </div>
    </header>

    <main className="grid">
      <nav className="nav">
        <div className="eyebrow">KEYMAP / LAYERS</div>
        <h2>Layers <span>{keymap?.layers.length ?? "—"}</span></h2>
        {keymap ? <div className="layer-list">{keymap.layers.map((layer, index) =>
          <button key={layer.id} className={"layer" + (layerIndex === index ? " active" : "")}
            onClick={() => { setLayerIndex(index); setSelected(null); }}>
            <small>{String(index).padStart(2, "0")}</small>{layer.name || "Layer " + index}<span>↗</span>
          </button>
        )}</div> : <p className="hint">연결 후 Studio Unlock을 실행하면 레이어를 불러옵니다.</p>}
        <div className="device-info"><div className="eyebrow">DEVICE INFO</div>
          <p><span>Connection</span><b>{connected ? "USB / SERIAL" : "—"}</b></p>
          <p><span>Studio</span><b>{connected ? (locked ? "LOCKED" : "UNLOCKED") : "—"}</b></p>
          <p><span>Keys</span><b>{layout?.keys.length ?? "—"}</b></p>
          <p><span>Mode</span><b>READ ONLY</b></p>
        </div>
      </nav>

      <section className="canvas-area">
        <div className="heading"><div><div className="eyebrow">PHYSICAL LAYOUT  /  SPLIT HEART</div>
          <h1>{currentLayer?.name || "Your keyboard"}</h1>
          <p>키보드의 실시간 Studio RPC 데이터를 표시합니다.</p>
        </div>{connected && <button className="btn secondary" disabled={loading} onClick={() => void refresh()}>
          {loading ? "불러오는 중…" : "↻ 키보드에서 새로고침"}
        </button>}</div>
        <div className="layout">
          <div className="layout-head"><span>SPLIT HEART · 60 KEYS</span><span>LIVE PHYSICAL LAYOUT</span></div>
          {layout && keymap && currentLayer
            ? <div className="svg-stage"><svg viewBox={"-20 -20 " +
                (Math.max(0, ...layout.keys.map(k => k.x + k.width)) + 40) + " " +
                (Math.max(0, ...layout.keys.map(k => k.y + k.height)) + 40)}
                aria-label="Physical layout" className="key-svg">
              {layout.keys.map((key, i) => {
                const b = currentLayer.bindings[i];
                const label = b ? bindingLabel(b.behaviorId, b.param1, b.param2, names)
                  : { title: "?", subtitle: "" };
                const rotation = key.r
                  ? "rotate(" + key.r / 100 + " " + (key.rx ?? key.x) + " " + (key.ry ?? key.y) + ")"
                  : undefined;
                return <g key={i} className={"key" + (selected === i ? " selected" : "")}
                  transform={rotation} role="button" tabIndex={0}
                  aria-label={"Position " + i + " " + label.title}
                  onClick={() => setSelected(i)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault(); setSelected(i);
                    }
                  }}>
                  <rect x={key.x + 2} y={key.y + 2} width={key.width - 4} height={key.height - 4} rx={9} />
                  <text className="key-index" x={key.x + 13} y={key.y + 18}>{String(i).padStart(2, "0")}</text>
                  <text className="key-name" textAnchor="middle" x={key.x + key.width / 2}
                    y={key.y + key.height / 2 + 8}
                    fontSize={label.title.length > 9 ? 13 : label.title.length > 4 ? 17 : 26}>{label.title}</text>
                  {label.subtitle && <text className="key-note" textAnchor="middle"
                    x={key.x + key.width / 2} y={key.y + key.height - 10}>{label.subtitle}</text>}
                </g>;
              })}</svg></div>
            : <div className="placeholder"><div className="large-emblem">◇</div>
                <h2>{connected ? (locked ? "Studio Unlock 필요" : "레이아웃을 불러오는 중") : "Connect your Split Heart"}</h2>
                <p>{connected
                  ? "오른쪽 엄지 Enter를 누른 채 P를 눌러 잠금을 해제하고, 새로고침을 클릭하세요."
                  : "왼쪽 키보드를 USB로 연결한 뒤 장치를 선택하세요. 펌웨어 설치는 이미 완료되어 있습니다."}</p>
                {!connected && <button className="btn primary" disabled={!hasSerial || loading} onClick={() => void connect()}>
                  {loading ? "연결 중…" : "Connect USB"}
                </button>}
                {!hasSerial && <small>Chrome 또는 Edge에서 localhost로 실행하세요.</small>}
              </div>}
          <div className="layout-bottom">SELECT A KEY TO INSPECT ITS BINDING</div>
        </div>
        {error && <div role="alert" className="error">{error}</div>}
        <div className="caption"><span>◈ &nbsp; ZMK STUDIO RPC</span><span>USB / CENTRAL</span><span>NO KEYMAP WRITES</span></div>
      </section>

      <aside className="inspector"><div className="eyebrow">INSPECTOR</div><h2>Key properties</h2>
        {binding && selected !== null
          ? <div className="props"><div className="selection"><small>POSITION {String(selected).padStart(2, "0")}</small>
              <strong>{chosen?.title}</strong><span>{chosen?.subtitle || "Behavior binding"}</span></div>
            <div><span>Layer</span><b>{currentLayer?.name || layerIndex}</b></div>
            <div><span>Behavior</span><b>{names[binding.behaviorId] || "#" + binding.behaviorId}</b></div>
            <div><span>Parameter 1</span><code>{binding.param1}</code></div>
            <div><span>Parameter 2</span><code>{binding.param2}</code></div>
            <p>읽기 전용 MVP입니다. 실시간 편집 및 저장 기능은 연결 검증 후 추가합니다.</p>
          </div>
          : <div className="nothing"><span>＋</span><p>키 하나를 선택하면 동작과 매개변수를 확인할 수 있습니다.</p></div>}
        <div className="inspector-bottom">SPLIT HEART / PERSONAL CONFIGURATOR</div>
      </aside>
    </main>
  </div>;
}

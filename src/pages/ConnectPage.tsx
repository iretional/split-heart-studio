import { Icon } from "../components/Icon";
import { TopBar } from "../components/Shell";
import type { Studio } from "../studio/useStudio";

const tips: [string, string][] = [
  ["Open in Chrome or Edge", "Web Serial does not work in other browsers or in app previews."],
  ["Use a data cable", "Charge-only cables do not create a serial port."],
  ["Check the firmware", "It needs CONFIG_ZMK_STUDIO=y and the studio-rpc-usb-uart snippet."],
  ["Close other Studio tabs", "Only one app can use the port at a time."],
];

export function ConnectPage({ studio, onMenu }: { studio: Studio; onMenu: () => void }) {
  const { hasSerial, loading, error, connect } = studio;
  return <>
    <TopBar title="Connect" subtitle="No keyboard connected" connected={false} onMenu={onMenu} />
    <div className="connect-body">
      <section className="hero">
        <div className="hero-icon"><Icon name="plug" size={26} /></div>
        <h1 className="t-display">Connect your<br />Split Heart</h1>
        <ol className="steps">
          {["Plug the left half into this computer with a USB data cable",
            "Click Connect USB and choose the Split Heart serial port",
            "If the keyboard is locked, hold System and press P"].map((s, i) =>
            <li key={i}><span className="step-num t-caption variant">{i + 1}</span><span className="t-body variant">{s}</span></li>)}
        </ol>
        <div className="actions">
          <button className="btn btn-primary btn-lg" disabled={!hasSerial || loading} onClick={() => void connect()}>
            {loading ? "Connecting…" : "Connect USB"}
          </button>
          <span className="t-caption muted">Chrome or Edge on desktop</span>
        </div>
        {!hasSerial && <Alert title="This browser can’t open serial ports"
          detail="Open this page in Chrome or Edge on a desktop computer, on localhost or HTTPS." />}
        {error?.kind === "no-port" && <Alert title="No port was selected"
          detail="The port picker closed without a choice. Click Connect USB again and pick the Split Heart port." />}
        {error?.kind === "other" && <Alert title="Couldn’t connect" detail={error.message} />}
      </section>
      <section className="card tips" aria-label="Troubleshooting">
        <p className="t-caption muted">PORT LIST IS EMPTY?</p>
        {tips.map(([t, d]) => <div key={t}><span className="t-body-strong">{t}</span><span className="t-caption muted">{d}</span></div>)}
      </section>
    </div>
  </>;
}

function Alert({ title, detail }: { title: string; detail: string }) {
  return <div className="alert" role="alert">
    <Icon name="warning" />
    <div><p className="t-body-strong danger-text">{title}</p><p className="t-caption variant">{detail}</p></div>
  </div>;
}

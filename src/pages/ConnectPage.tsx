import { Icon } from "../components/Icon";
import { TopBar } from "../components/Shell";
import { Notice } from "../components/ui";
import { useIsMobile } from "../studio/prefs";
import type { Studio } from "../studio/useStudio";

const tips: [string, string][] = [
  ["Open in Chrome or Edge", "Web Serial does not work in other browsers or in app previews."],
  ["Use a data cable", "Charge-only cables do not create a serial port."],
  ["Check the firmware", "It needs CONFIG_ZMK_STUDIO=y and the studio-rpc-usb-uart snippet."],
  ["Close other Studio tabs", "Only one app can use the port at a time."],
];

export function ConnectPage({ studio, onMenu }: { studio: Studio; onMenu: () => void }) {
  const { hasSerial, hasBluetooth, loading, error, connect } = studio;
  const mobile = useIsMobile();
  const steps = mobile
    ? ["Pair Split Heart with this phone in Bluetooth settings", "Tap Connect Bluetooth and choose Split Heart", "If the keyboard is locked, hold System and press P"]
    : ["Plug the left half into this computer with a USB data cable", "Click Connect USB and choose the Split Heart serial port", "If the keyboard is locked, hold System and press P"];
  return <>
    <TopBar title="Connect" subtitle={mobile ? "No keyboard" : "No keyboard connected"} studio={studio} onMenu={onMenu} />
    <div className="connect-body">
      <section className="hero">
        <div className="hero-icon"><Icon name="plug" size={26} /></div>
        <h1 className="t-display">Connect your<br />Split Heart</h1>
        <ol className="steps">
          {steps.map((s, i) =>
            <li key={i}><span className="step-num t-caption variant">{i + 1}</span><span className="t-body variant">{s}</span></li>)}
        </ol>
        {mobile ? <div className="connect-mobile-actions">
          <Notice>Works in Chrome on Android. Browsers on iPhone can’t connect to keyboards.</Notice>
          <button className="btn btn-primary connect-big" disabled={!hasBluetooth || loading} onClick={() => void connect("bluetooth")}>{loading ? "Connecting…" : "Connect Bluetooth"}</button>
        </div> : <div className="actions">
          <button className="btn btn-primary btn-lg" disabled={!hasSerial || loading} onClick={() => void connect("usb")}>
            {loading ? "Connecting…" : "Connect USB"}
          </button>
          <span className="t-caption muted">Chrome or Edge on desktop</span>
        </div>}
        {!mobile && !hasSerial && <Alert title="This browser can’t open serial ports"
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

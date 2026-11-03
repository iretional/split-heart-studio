import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { defaultButtonFx } from "./buttonFx";
import { blockTextDrag } from "./noTextDrag";
import "./styles.css";

blockTextDrag();
defaultButtonFx();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import AboutPanel from "./panels/AboutPanel";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AboutPanel />
  </React.StrictMode>,
);

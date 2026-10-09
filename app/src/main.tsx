import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/literata";
import "@fontsource-variable/literata/wght-italic.css";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/caveat";
import "@fontsource-variable/jetbrains-mono";
import "katex/dist/katex.min.css";
import "./theme/tailwind.css";
import "./app.css";
import "./views/views.css";
import { applyTheme } from "./theme";
import "./setup";
import { App } from "./App";

applyTheme();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

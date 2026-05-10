import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import data from "./data/examples.generated.json";
import "./styles.css";
import type { LandingData } from "./types.ts";

const root = document.getElementById("root")!;
createRoot(root).render(
  <StrictMode>
    <App data={data as LandingData} />
  </StrictMode>,
);

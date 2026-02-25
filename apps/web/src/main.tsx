import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { makeTheme } from "./theme";

type ColorMode = "light" | "dark";

function Main() {
  const [mode, setMode] = useState<ColorMode>(() => {
    const saved = localStorage.getItem("color-mode");
    return saved === "dark" || saved === "light" ? saved : "light";
  });

  const toggleColorMode = () => {
    setMode((prev) => {
      const next: ColorMode = prev === "light" ? "dark" : "light";
      localStorage.setItem("color-mode", next);
      return next;
    });
  };

  return (
    <ThemeProvider theme={makeTheme(mode)}>
      <CssBaseline />
      <App mode={mode} toggleColorMode={toggleColorMode} />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);

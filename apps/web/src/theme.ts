import { createTheme } from "@mui/material/styles";

export function makeTheme(mode: "light" | "dark") {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,

      // kill the default MUI blue
      primary: {
        main: isDark ? "#ffffff" : "#000000",
        contrastText: isDark ? "#000000" : "#ffffff",
      },

      // optional secondary (z.B. für outlined / accents)
      secondary: {
        main: isDark ? "#bdbdbd" : "#424242",
      },

      background: {
        default: isDark ? "#0b0b0b" : "#ffffff",
        paper: isDark ? "#111111" : "#ffffff",
      },

      text: {
        primary: isDark ? "#ffffff" : "#000000",
        secondary: isDark ? "#bdbdbd" : "#4b4b4b",
      },

      divider: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    },
  });
}

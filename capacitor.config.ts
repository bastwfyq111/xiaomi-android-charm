import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ye.medicalcouncil.financial",
  appName: "النظام المالي للمجلس الطبي",
  webDir: "dist",
  bundledWebRuntime: false,
  loggingBehavior: "none",
  server: {
    androidScheme: "https",
  },
};

export default config;

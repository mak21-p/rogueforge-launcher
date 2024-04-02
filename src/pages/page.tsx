import { useEffect, useState } from "react";

import { InstallState } from "@/types/installState.type";

import BrowsePage from "./BrowsePage";
import InstallPage from "./InstallPage";
import { getVersion } from "@tauri-apps/api/app";

export default function DashboardPage() {
  const [installState, setInstallState] = useState<InstallState>(
    InstallState.LOCATE
  );
  const [appVersion, setAppVersion] = useState("");

  async function openDiscord() {
    openurl("https://discord.gg/akWECFMv");
  }

  async function openRoadmap() {
    openurl(
      "https://discord.com/channels/1216537984795676692/1216540357823565874"
    );
  }

  async function openurl(url: string) {
    window.open(url, "_blank")!.focus;
  }

  function resetLocation() {
    localStorage.clear();
    setInstallState(InstallState.LOCATE);
  }

  async function showVersion() {
    const ver = await getVersion();
    setAppVersion(ver);
  }

  useEffect(() => {
    const gameDir = localStorage.getItem("gameDir");
    showVersion();

    if (gameDir) {
      setInstallState(InstallState.INSTALL);
    }
  }, []);

  return (
    <div className="flex h-full w-full flex-col gap-10">
      <div className="menubar">
        <button className="menubutton" onClick={resetLocation}>
          reset install location
        </button>
        <button className="menubutton" onClick={openDiscord}>
          discord
        </button>
        <button className="menubutton" onClick={openRoadmap}>
          roadmap
        </button>
      </div>
      <div className="actions">
        {installState === InstallState.LOCATE && (
          <BrowsePage setInstallState={setInstallState} />
        )}
        {installState === InstallState.INSTALL && (
          <InstallPage setInstallState={setInstallState} />
        )}
      </div>
      <div className="appVersion">v{appVersion}</div>
    </div>
  );
}

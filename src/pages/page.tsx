import { useEffect, useState } from "react"

import { InstallState } from "@/types/installState.type"

import BrowsePage from "./BrowsePage"
import InstallPage from "./InstallPage"

export default function DashboardPage() {
  const [installState, setInstallState] = useState<InstallState>(
    InstallState.LOCATE
  )

  useEffect(() => {
    const gameDir = localStorage.getItem("gameDir")

    if (gameDir) {
      setInstallState(InstallState.INSTALL)
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
        Echoes WoW
      </h1>
      {installState === InstallState.LOCATE && (
        <BrowsePage setInstallState={setInstallState} />
      )}
      {installState === InstallState.INSTALL && (
        <InstallPage setInstallState={setInstallState} />
      )}
    </div>
  )
}

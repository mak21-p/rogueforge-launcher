import { open } from "@tauri-apps/api/dialog"

import { InstallState } from "@/types/installState.type"
import { Button } from "@/components/ui/button"

const BrowsePage = (props: {
  setInstallState: React.Dispatch<React.SetStateAction<InstallState>>
}) => {
  async function locateWow() {
    const selected = await open({ multiple: false, directory: true })
    if (typeof selected === "string") {
      console.log(selected)
      localStorage.setItem("gameDir", selected)
      props.setInstallState(InstallState.INSTALL)
    }
  }
  return (
    <div>
      <Button
        className="bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
        size={"lg"}
        onClick={() => locateWow()}
      >
        Locate Game
      </Button>
    </div>
  )
}

export default BrowsePage

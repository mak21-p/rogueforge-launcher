import { open } from "@tauri-apps/api/dialog"

import { InstallState } from "@/types/installState.type"

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
      <button
        className="actionbutton"
        onClick={() => locateWow()}
      >
        Locate Game
      </button>
    </div>
  )
}

export default BrowsePage

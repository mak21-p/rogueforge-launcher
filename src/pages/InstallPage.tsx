import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { Loader2 } from "lucide-react";

import { fileList } from "@/types/fileList";
import { InstallState } from "@/types/installState.type";
import { Patch } from "@/types/patch.type";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";

const InstallPage = (props: {
  setInstallState: React.Dispatch<React.SetStateAction<InstallState>>;
}) => {
  const [dlArray, setDlArray] = useState<
    {
      fileName: string;
      filePath: string;
    }[]
  >([]);

  const [progress, setProgress] = useState<number>(1);
  const [pageState, setPageState] = useState<
    "button" | "progress" | "update" | "play"
  >("button");

  async function sha256(filePath: string) {
    const gameDir = localStorage.getItem("gameDir");
    const fileResponse = await invoke("sha256_digest", {
      fileLocation: gameDir + filePath,
    });
    return fileResponse;
  }

  async function getGameFiles() {
    const filesToDownload: { fileName: string; filePath: string }[] = [];
    setDlArray([]);

    const gameDir = localStorage.getItem("gameDir");

    if (gameDir === null) {
      toast({ title: "Set Game Directory first", variant: "destructive" });
      localStorage.removeItem("gameDir");
      props.setInstallState(InstallState.LOCATE);
      return;
    }

    await Promise.all(
      fileList.map(async (file) => {
        try {
          await invoke("check_file_exists", {
            filePath: gameDir + file.filePath,
          });
        } catch (error) {
          console.log(error);
          filesToDownload.push(file);
        }
      })
    );

    if (filesToDownload.length > 0) {
      console.log("SETTING NOW");
      setDlArray(filesToDownload);
    }

    if (filesToDownload.length === 0) {
      setPageState("update");
    }
  }

  useEffect(() => {
    if (pageState === "button") {
      getGameFiles();
    }
  }, []);

  useEffect(() => {
    if (pageState === "update") {
      getPatches();
    }
  }, [pageState]);

  useEffect(() => {
    if (dlArray.length > 0) {
      downloadFiles();
    }
  }, [dlArray]);

  async function getPatches() {
    try {
      const response = await invoke("get_patches");
      const patches: Patch[] = JSON.parse(response as any);
      let toDownload: { fileName: string; filePath: string }[] = [];
      await Promise.all(
        fileList.map(async (file) => {
          const sha: string = (await sha256(file.filePath)) as any;
          const patch = patches.find((p) => p.ObjectName === file.fileName);
          if (patch && patch.Checksum !== sha.toUpperCase()) {
            console.log(patch.Checksum);
            console.log(sha);
            toDownload.push({
              fileName: file.fileName,
              filePath: file.filePath,
            });
            console.log(toDownload);
          }
        })
      );
      console.log(toDownload);
      setDlArray(toDownload);
      if (toDownload.length > 0) {
        return;
      } else {
        setPageState("play");
      }
    } catch (error) {}
  }

  async function downloadFiles() {
    const downloadEndpoint = "https://echopatches.b-cdn.net/";
    const destinations: string[] = [];
    const urls: string[] = [];
    console.log(dlArray);

    if (!dlArray) {
      toast({ title: "No items to download", variant: "destructive" });
      return;
    }

    dlArray.forEach((f) => {
      const gameDir = localStorage.getItem("gameDir");
      destinations.push(gameDir + f.filePath);
      urls.push(downloadEndpoint + f.fileName);
    });

    try {
      console.log(destinations);
      setPageState("progress");
      const response = await invoke("download_files", {
        urls: urls,
        destinations: destinations,
      });
      console.log(response);
      setPageState("button");
      getGameFiles();
    } catch (error) {
      toast({ title: "Error" + error, variant: "destructive" });
    }
  }

  useEffect(() => {
    const unlisten = listen<string>("DOWNLOAD_PROGRESS", (event) => {
      const progress: any = event.payload;
      setProgress(progress.percentage);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  async function startGame() {
    const gameDir = localStorage.getItem("gameDir");
    await invoke("open_app", { path: gameDir + "\\wow.exe" });
  }

  return (
    <div>
      {dlArray.length > 0 && pageState === "button" && (
        <Button
          className="w-[60%] bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
          size={"lg"}
          onClick={() => downloadFiles()}
        >
          Download Files
        </Button>
      )}
      {pageState === "progress" && (
        <Progress className="w-[60%] bg-zinc-900" value={progress} />
      )}
      {pageState === "play" && (
        <div>
          <button
            className="actionbutton"
            onClick={() => startGame()}
          >
            Play
          </button>
          <div className="settings">
            <button className='subaction' onClick={() => {
              setPageState("button");
              getGameFiles();
            }}>
              force update
            </button>
            </div>
        </div>
      )}
      {pageState === "update" && <Loader2 className="animate-spin" />}
    </div>
  );
};

export default InstallPage;

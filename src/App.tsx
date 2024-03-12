import "./App.css";
import { cn } from "./lib/utils";
import { Toaster } from "@/components/ui/toaster";
import DashboardPage from "./pages/page";

function App() {
  return (
    <div className="h-screen overflow-clipcontainer">
      <Toaster />
      {/* <Menu /> */}
      <div
        className={cn(
          "h-screen overflow-auto bg-background pb-8",
          // "scrollbar-none"
          "scrollbar scrollbar-track-transparent scrollbar-thumb-accent scrollbar-thumb-rounded-md"
        )}
      >
        <DashboardPage />
      </div>
    </div>
  );
}

export default App;

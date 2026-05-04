"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import TeamDialog from "@/components/team-dialog";
import LabelDialog from "@/components/label-dialog";
import {
  Activity,
  ChevronRight,
  Home,
  Menu,
  Tag,
  Users,
  LayoutDashboard,
} from "lucide-react";

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex min-h-screen">
      <aside
        className={`${
          isOpen ? "w-56" : "w-16"
        } flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 transition-all duration-300 ease-in-out shrink-0`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-3">
          {isOpen && (
            <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Kanban
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="ml-auto"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {/* Board */}
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className={`w-full justify-start gap-2 font-medium ${!isOpen ? "justify-center px-0" : ""} ${pathname === "/" ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {isOpen && <span>Board</span>}
            </Button>

            {/* Activity Log */}
            <Button
              variant="ghost"
              onClick={() => router.push("/activity")}
              className={`w-full justify-start gap-2 font-medium ${!isOpen ? "justify-center px-0" : ""} ${pathname === "/activity" ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}
            >
              <Activity className="h-4 w-4 shrink-0" />
              {isOpen && <span>Activity</span>}
            </Button>


            {/* Labels — opens dialog */}
            <Button
              variant="ghost"
              onClick={() => setShowLabelDialog(true)}
              className={`w-full justify-start gap-2 font-medium ${!isOpen && "justify-center px-0"}`}
            >
              <Tag className="h-4 w-4 shrink-0" />
              {isOpen && <span>Add a Label</span>}
            </Button>

            {/* Team — opens dialog */}
            <Button
              variant="ghost"
              onClick={() => setShowTeamDialog(true)}
              className={`w-full justify-start gap-2 font-medium ${!isOpen && "justify-center px-0"}`}
            >
              <Users className="h-4 w-4 shrink-0" />
              {isOpen && <span>Team</span>}
            </Button>
          </nav>
        </ScrollArea>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-auto">
        {children}
      </main>

      <TeamDialog open={showTeamDialog} onClose={() => setShowTeamDialog(false)} />
      <LabelDialog open={showLabelDialog} onClose={() => setShowLabelDialog(false)} />
    </div>
  );
}

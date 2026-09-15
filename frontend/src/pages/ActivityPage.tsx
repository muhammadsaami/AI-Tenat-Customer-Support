import { useState } from "react";
import { Activity as ActivityIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { PageHeader } from "@/components/layout/PageHeader";
import { activity } from "@/services/mock/data";
import { isMockMode } from "@/services/api/client";
import { useToast } from "@/context/ToastProvider";

export function ActivityPage() {
  const { push } = useToast();
  const demo = isMockMode();
  const [filter, setFilter] = useState<"all" | ActivityFilter>("all");

  const filtered =
    filter === "all" ? activity : activity.filter((a) => a.type === filter);

  return (
    <div className="container-page">
      <PageHeader
        title="Activity"
        subtitle={
          demo
            ? "A live log of what happened across your workspace."
            : "Event log will stream uploads, questions, and indexing events from the backend."
        }
        actions={
          <Button variant="secondary" onClick={() => push({ type: "info", title: "Export log", description: "Export will stream real activity once the events API is connected." })}>
            <Download size={15} />
            Export log
          </Button>
        }
      />

      <div className="row" style={{ gap: 12, marginBottom: 22 }}>
        <Segmented
          ariaLabel="Filter activity"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "upload", label: "Uploads" },
            { value: "chat", label: "Questions" },
            { value: "index", label: "Indexing" },
            { value: "user", label: "People" },
            { value: "system", label: "System" },
          ]}
        />
      </div>

      <div className="panel" style={{ maxWidth: 720 }}>
        {demo && filtered.length > 0 ? (
          <ActivityFeed items={filtered} />
        ) : (
          <div className="state-box">
            <span className="state-icon"><ActivityIcon size={22} /></span>
            <div className="state-title">
              {demo ? "No activity in this category yet" : "Live activity log coming"}
            </div>
            <div className="state-desc">
              {demo
                ? "Events will appear here as your team uploads, asks, and indexes."
                : "Upload and chat events will stream here once the backend events endpoint is connected."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ActivityFilter = "upload" | "chat" | "index" | "user" | "system";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export let loggerProvider: LoggerProvider | undefined;
export let posthogLog:
  | ReturnType<LoggerProvider["getLogger"]>
  | undefined;
let shutdownRegistered = false;

if (token && host) {
  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": "ai-wizard-duel-nextjs",
    }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${host.replace(/\/$/, "")}/i/v1/logs`,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      }),
    ],
  });
  posthogLog = loggerProvider.getLogger("posthog-nextjs-logs");
} else if (process.env.NODE_ENV !== "production") {
  const missingVariable = token
    ? "NEXT_PUBLIC_POSTHOG_HOST"
    : "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";

  console.warn(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    posthogLog?.emit({
      body: "PostHog Next.js log exporter configured",
      severityNumber: SeverityNumber.INFO,
      attributes: { component: "posthog_log_exporter" },
    });

    if (loggerProvider && !shutdownRegistered) {
      shutdownRegistered = true;
      process.once("beforeExit", () => {
        void loggerProvider?.shutdown().catch(() => {});
      });
    }
  }
}

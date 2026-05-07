import type { DynamicSubmission } from "../types/submission";

interface Props {
  data: DynamicSubmission;
}

type ListEntry = {
  label?: string;
  title?: string;
  description?: string;
  checked?: boolean;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asList(value: unknown) {
  return Array.isArray(value) ? (value as ListEntry[]) : [];
}

export default function DocumentTemplate({ data }: Props) {
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
          }

          #pdf-content {
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          .pdf-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <article
        id="pdf-content"
        className="mx-auto w-[190mm] max-w-full bg-white p-[14mm] font-sans text-gray-800"
        style={{ boxSizing: "border-box" }}
      >
        <header className="mb-6 border-b-4 border-primary pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-light">
                AI Engagement Critique Report
              </p>
              <h1 className="mt-2 break-words text-2xl font-black leading-tight text-gray-900">
                {data.gameTitle}
              </h1>
            </div>
            <div className="text-left text-xs text-gray-500 sm:text-right">
              <p>Date: {new Date(data.timestamp).toLocaleDateString()}</p>
              {data.classCode && <p>Class: {data.classCode}</p>}
            </div>
          </div>
        </header>

        <div className="grid gap-5">
          {data.blocks.map((block, index) => (
            <section key={`${block.title}-${index}`} className="pdf-section rounded-xl border border-gray-200 p-4">
              <h2 className="mb-3 border-l-4 border-primary-light pl-3 text-sm font-black uppercase tracking-[0.14em] text-primary">
                {block.title}
              </h2>

              {block.type === "key-value" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(asRecord(block.data)).map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        {key}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold leading-6 text-gray-800">
                        {String(value || "-")}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {block.type === "header" && (
                <p className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm leading-7 text-gray-700">
                  {String(block.data || "-")}
                </p>
              )}

              {block.type === "analysis-box" && (
                <div className="rounded-lg border border-green-100 bg-green-50/40 p-4">
                  <p className="break-words text-sm italic leading-7 text-gray-700">
                    {String(asRecord(block.data).summary || "-")}
                  </p>
                </div>
              )}

              {block.type === "list" && (
                <ul className="grid gap-2">
                  {asList(block.data).map((item, itemIndex) => (
                    <li key={`${item.title || item.label}-${itemIndex}`} className="flex gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                      <span className="mt-0.5 font-black text-primary">
                        {typeof item.checked === "boolean" ? (item.checked ? "✓" : "•") : "•"}
                      </span>
                      <span className="min-w-0 text-gray-700">
                        <span className="block break-words font-semibold">
                          {item.label || item.title || "-"}
                        </span>
                        {item.description && (
                          <span className="mt-1 block break-words text-xs leading-5 text-gray-500">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-8 border-t border-dashed pt-4 text-center text-[10px] leading-5 text-gray-400">
          This document was generated from the Critique page data. CMU Game Design Program.
        </footer>
      </article>
    </>
  );
}

export const prerender = false;

import type { APIRoute } from "astro";
import { generateSchema } from "../../../lib/validation/ai";
import {
  assertAuthenticated,
  generateProposals,
  generateProposalsStream,
  logEventGeneration,
  UnauthorizedError,
} from "../../../lib/services/ai.service";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    const { userId } = await assertAuthenticated(supabase);

    const acceptsSse = (request.headers.get("accept") || "").includes("text/event-stream");
    const TIMEOUT_MS = 30000;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Unsupported Media Type" }), {
        status: 415,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = await request.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = generateSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    if (acceptsSse) {
      const stream = new ReadableStream<Uint8Array>({
        start: async (controller) => {
          const encoder = new TextEncoder();
          // Heartbeat ping and timeout handling
          let pingInterval: ReturnType<typeof setInterval> | undefined;
          let timeoutId: ReturnType<typeof setTimeout> | undefined;
          const abortController = new AbortController();
          const onRequestAbort = () => abortController.abort();
          request.signal.addEventListener("abort", onRequestAbort);
          timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);
          try {
            controller.enqueue(encoder.encode(`:ok\n\n`));
            pingInterval = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(`: ping\n\n`));
              } catch {}
            }, 15000);
            for await (const event of generateProposalsStream(supabase, parsed.data, { signal: abortController.signal })) {
              const payload = JSON.stringify({ type: event.type, data: event.data });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              if (event.type === "done") {
                try {
                  await logEventGeneration(supabase, userId, {
                    event_name: "generation",
                    request_id: event.data.request_id,
                    properties: { returned_count: event.data.returned_count },
                  });
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error("[api/ai/generate] SSE logEventGeneration failed", e);
                }
              }
            }
          } catch (err) {
            const message = (err as Error)?.message || "Stream error";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", data: { message } })}\n\n`));
          } finally {
            if (pingInterval) clearInterval(pingInterval);
            if (timeoutId) clearTimeout(timeoutId);
            request.signal.removeEventListener("abort", onRequestAbort);
            controller.close();
          }
        },
        cancel: () => {
          // noop: rely on AbortSignal from the request to stop generation loop
        },
      });

      const headers = new Headers({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      return new Response(stream, { status: 200, headers });
    }

    // Non-SSE: enforce timeout via Promise.race and return 408 on timeout
    const result = await Promise.race([
      generateProposals(supabase, parsed.data, { signal: request.signal }),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ]) as Awaited<ReturnType<typeof generateProposals>>;

    await logEventGeneration(supabase, userId, {
      event_name: "generation",
      request_id: result.request_id,
      properties: { returned_count: result.returned_count },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/ai/generate] POST failed", error);
    if (error instanceof UnauthorizedError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if ((error as Error)?.name === "AbortError") {
      return new Response(JSON.stringify({ error: "Request timeout" }), {
        status: 408,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};



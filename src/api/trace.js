// Real OpenTelemetry trace context for frontend API requests (src/api/client.js).
//
// Trace ids are NEVER fabricated here. A WebTracerProvider span is started
// per API operation; the W3C `traceparent` header is INJECTED from that
// span's context by the standard propagator, and the span's trace/span ids
// ride along into frontend log events so the backend ingest record shows
// the ORIGINAL operation's trace (not the ingest hop's — see README §11).
//
// The spans are not exported anywhere (no span processors): they exist only
// to produce correct, real trace context and ids — zero network egress.
// VITE_TRACE=false disables all of it: no span, no traceparent header,
// no ids (request correlation via X-Request-ID keeps working).
import {
  ROOT_CONTEXT,
  SpanStatusCode,
  defaultTextMapSetter,
  trace,
} from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";

let tracer = null;
let propagator = null;

const traceEnabled = () => import.meta.env.VITE_TRACE !== "false";

function ensureTracer() {
  if (!traceEnabled()) return null;
  if (!tracer) {
    // Spans end and are discarded (no processors) — context/ids only.
    propagator = new W3CTraceContextPropagator();
    tracer = new WebTracerProvider().getTracer("hrdesk-frontend");
  }
  return tracer;
}

// Start the per-operation span. Returns null when tracing is disabled —
// every other helper treats null as "no tracing here", keeping behavior
// identical to a plain untraced request.
export function startRequestSpan(method, endpoint) {
  const t = ensureTracer();
  if (!t) return null;
  const span = t.startSpan(`HTTP ${method}`, {
    attributes: {
      "http.request.method": method,
      "url.path": endpoint, // path only — query strings are never logged
    },
  });
  return { span, spanContext: span.spanContext() };
}

// Inject the W3C `traceparent` into the request headers from the span.
export function injectTraceHeaders(headers, entry) {
  if (!entry) return headers;
  const ctx = trace.setSpan(ROOT_CONTEXT, entry.span);
  propagator.inject(ctx, headers, defaultTextMapSetter);
  return headers;
}

// { traceId, spanId } hex ids for log events — {} when tracing is off.
export function traceContextFields(entry) {
  if (!entry) return {};
  return { traceId: entry.spanContext.traceId, spanId: entry.spanContext.spanId };
}

// Close the span (every exit path of request() must call this once).
export function endRequestSpan(entry, { statusCode, error } = {}) {
  if (!entry) return;
  const span = entry.span;
  if (statusCode !== undefined) {
    span.setAttribute("http.response.status_code", statusCode);
  }
  if (error !== undefined && error !== null) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }
  span.end();
}

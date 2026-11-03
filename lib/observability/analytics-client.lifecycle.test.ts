import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));

const properties = { page_path: "/sauna", locale: "pl", page_type: "other" as const };

async function loadClient() {
  vi.resetModules();
  return import("./analytics-client");
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_FORCE", "1");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  window.localStorage.clear();
  window.sessionStorage.clear();
  Object.values(posthogMock).forEach((fn) => fn.mockClear());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("startAnalytics", () => {
  it("opts in once, without an $opt_in event, however often it is called", async () => {
    window.localStorage.setItem("mh-analytics-consent", "granted");
    const { startAnalytics, trackPageview } = await loadClient();

    await Promise.all([startAnalytics(), startAnalytics()]);
    await trackPageview(properties);
    await trackPageview({ ...properties, page_path: "/results", page_type: "results" });

    expect(posthogMock.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(posthogMock.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(posthogMock.capture.mock.calls.filter(([event]) => event === "$pageview")).toHaveLength(2);
  });

  it("loads nothing without consent", async () => {
    const { startAnalytics, trackPageview } = await loadClient();

    await startAnalytics();
    await trackPageview(properties);

    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });
});

describe("stopAnalytics", () => {
  it("resets before opting out and leaves no PostHog keys or cookies behind", async () => {
    window.localStorage.setItem("mh-analytics-consent", "granted");
    const { startAnalytics, stopAnalytics } = await loadClient();
    await startAnalytics();

    window.localStorage.setItem("ph_phc_test_posthog", "{}");
    window.localStorage.setItem("__ph_opt_in_out_phc_test", "0");
    window.sessionStorage.setItem("ph_phc_test_window_id", "x");
    document.cookie = "ph_phc_test_posthog=%7B%7D; path=/";
    document.cookie = "NEXT_LOCALE=pl; path=/";
    window.localStorage.setItem("mh-analytics-consent", "denied");

    await stopAnalytics();

    const order = [posthogMock.reset.mock.invocationCallOrder[0], posthogMock.opt_out_capturing.mock.invocationCallOrder[0]];
    expect(order[0]).toBeLessThan(order[1]);
    expect(Object.keys(window.localStorage)).toEqual(["mh-analytics-consent"]);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toContain("NEXT_LOCALE=pl");
    expect(document.cookie).not.toContain("ph_");
  });

  it("also cleans up when the library was never loaded in this page", async () => {
    window.localStorage.setItem("ph_phc_test_posthog", "{}");
    const { stopAnalytics } = await loadClient();

    await stopAnalytics();

    expect(window.localStorage.getItem("ph_phc_test_posthog")).toBeNull();
    expect(posthogMock.opt_out_capturing).not.toHaveBeenCalled();
  });
});

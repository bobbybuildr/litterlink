import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/env/public", () => ({
  publicEnv: { supabaseUrl: "http://localhost:54321", supabasePublishableKey: "test-key" },
}));

const getUser = vi.fn();
const getClaims = vi.fn();

type ClientOptions = {
  cookies: { setAll: (cookies: { name: string; value: string; options?: object }[]) => void };
};

beforeEach(() => {
  vi.resetAllMocks();
  getClaims.mockResolvedValue({ data: null, error: null });
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  vi.mocked(createServerClient).mockReturnValue({ auth: { getUser, getClaims } } as never);
});

function signedIn() {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
}

function run(path: string) {
  return updateSession(new NextRequest(`http://localhost${path}`));
}

describe("updateSession on public pages", () => {
  it.each(["/", "/events", "/events/abc", "/groups", "/groups/some-group", "/impact", "/terms", "/forgot-password"])(
    "refreshes the session from the token claims on %s, without asking the Auth server",
    async (path) => {
      const response = await run(path);

      expect(getClaims).toHaveBeenCalledTimes(1);
      expect(getUser).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  );

  it("passes cookies refreshed during that check on to the response", async () => {
    getClaims.mockImplementation(async () => {
      const options = vi.mocked(createServerClient).mock.calls[0][2] as unknown as ClientOptions;
      options.cookies.setAll([{ name: "sb-test-auth-token", value: "refreshed", options: { path: "/" } }]);
      return { data: null, error: null };
    });

    const response = await run("/terms");

    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
  });
});

describe("updateSession on protected routes", () => {
  it.each(["/dashboard", "/events/create", "/profile", "/profile/abc"])(
    "verifies the user with the Auth server on %s",
    async (path) => {
      signedIn();

      const response = await run(path);

      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getClaims).not.toHaveBeenCalled();
      expect(response.headers.get("location")).toBeNull();
    }
  );

  it("sends anonymous visitors to sign in and remembers where they were going", async () => {
    const response = await run("/dashboard");

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("redirectTo")).toBe("/dashboard");
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
  });

  it("marks profile pages noindex, on the sign-in redirect as well as on the page", async () => {
    const redirect = await run("/profile/abc");
    expect(redirect.status).toBe(307);
    expect(new URL(redirect.headers.get("location")!).searchParams.get("message")).toMatch(/Sign in/);
    expect(redirect.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");

    signedIn();
    const page = await run("/profile/abc");
    expect(page.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});

describe("updateSession on sign-in and sign-up", () => {
  it.each(["/sign-in", "/sign-up"])("verifies the user with the Auth server on %s", async (path) => {
    await run(path);

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("sends a signed-in user to the dashboard instead", async () => {
    signedIn();

    const response = await run("/sign-in?redirectTo=%2Fevents");

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/dashboard");
    expect(location.search).toBe("");
  });

  it("lets anonymous visitors through", async () => {
    const response = await run("/sign-up");

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

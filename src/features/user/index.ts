import { http } from "@/lib/http";

type Font = "atkinson-hyperlegible" | "manrope" | "sf-pro-rounded";

export const userApi = {
  getMe: () =>
    http.get<{
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      timezone: string;
      theme: "dark" | "light";
      font: Font | null;
    }>("/user/me"),
  updateMe: (body: { timezone?: string; name?: string; theme?: "dark" | "light"; font?: Font }) =>
    http.put<{ token?: string } & Record<string, unknown>>("/user/me", body),
};

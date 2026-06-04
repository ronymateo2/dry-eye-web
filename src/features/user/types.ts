export type UserFont = "atkinson-hyperlegible" | "manrope" | "sf-pro-rounded";

export type Me = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  timezone: string;
  theme: "dark" | "light";
  font: UserFont | null;
};

export type UpdateMeBody = {
  timezone?: string;
  name?: string;
  theme?: "dark" | "light";
  font?: UserFont;
};

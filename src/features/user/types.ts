export type UserFont = "atkinson-hyperlegible" | "manrope" | "sf-pro-rounded";

export type Me = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  timezone: string;
  theme: "dark" | "light";
  font: UserFont | null;
  notifications_enabled: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  widget_drop_type_ids: string[];
};

export type UpdateMeBody = {
  timezone?: string;
  name?: string;
  theme?: "dark" | "light";
  font?: UserFont;
  widgetDropTypeIds?: string[];
};

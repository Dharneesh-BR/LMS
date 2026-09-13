const isLocalBrowser =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const designMode =
  isLocalBrowser && process.env.NEXT_PUBLIC_DESIGN_MODE === "true";

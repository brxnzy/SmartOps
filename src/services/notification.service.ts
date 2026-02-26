import { sileo, type SileoOptions, type SileoPosition, type SileoState } from "sileo";

type NotifyType = Exclude<SileoState, "loading">;

export interface NotifyOptions extends Omit<SileoOptions, "type"> {
  type?: NotifyType;
}

const DEFAULT_OPTIONS: Pick<SileoOptions, "fill" | "styles"> = {
  fill: "#171717",
  styles: {
    title: "text-white text-[15px]! font-medium!",
    description: "text-white/75 text-[14px]!",
  },
};

function withDefaults(options: NotifyOptions): SileoOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    styles: {
      ...DEFAULT_OPTIONS.styles,
      ...options.styles,
    },
  };
}

export interface NotifyPromiseOptions<T = unknown> {
  loading: NotifyOptions;
  success: NotifyOptions | ((data: T) => NotifyOptions);
  error: NotifyOptions | ((error: unknown) => NotifyOptions);
  action?: NotifyOptions | ((data: T) => NotifyOptions);
  position?: SileoPosition;
}

export function notify({ type = "info", ...options }: NotifyOptions) {
  const payload: SileoOptions = withDefaults({ ...options, type });

  switch (type) {
    case "success":
      return sileo.success(payload);
    case "error":
      return sileo.error(payload);
    case "warning":
      return sileo.warning(payload);
    case "action":
      return sileo.action(payload);
    case "info":
    default:
      return sileo.info(payload);
  }
}

export function notifyPromise<T>(
  promise: Promise<T> | (() => Promise<T>),
  options: NotifyPromiseOptions<T>
) {
  const successOption = options.success;
  const errorOption = options.error;
  const actionOption = options.action;

  return sileo.promise(promise, {
    ...options,
    loading: withDefaults(options.loading),
    success:
      typeof successOption === "function"
        ? (data: T) => withDefaults(successOption(data))
        : withDefaults(successOption),
    error:
      typeof errorOption === "function"
        ? (error: unknown) => withDefaults(errorOption(error))
        : withDefaults(errorOption),
    action:
      typeof actionOption === "function"
        ? (data: T) => withDefaults(actionOption(data))
        : actionOption
          ? withDefaults(actionOption)
          : undefined,
  });
}

export const notifications = {
  show: notify,
  success: (options: Omit<NotifyOptions, "type">) =>
    notify({ ...options, type: "success" }),
  error: (options: Omit<NotifyOptions, "type">) =>
    notify({ ...options, type: "error" }),
  warning: (options: Omit<NotifyOptions, "type">) =>
    notify({ ...options, type: "warning" }),
  info: (options: Omit<NotifyOptions, "type">) =>
    notify({ ...options, type: "info" }),
  action: (options: Omit<NotifyOptions, "type">) =>
    notify({ ...options, type: "action" }),
  promise: notifyPromise,
  dismiss: sileo.dismiss,
  clear: sileo.clear,
};

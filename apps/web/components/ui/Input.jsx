"use client";

/**
 * Props:
 * - error: string | boolean   -> red border + message
 * - success: string | boolean -> green border + message
 * - leftIcon / rightIcon: ReactNode
 * - hint: string              -> muted helper text
 */
export default function Input({
  className = "",
  error,
  success,
  leftIcon,
  rightIcon,
  hint,
  ...props
}) {
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success) && !hasError;

  const ring =
    hasError
      ? "focus:ring-brand-danger/40 border-brand-danger"
      : hasSuccess
      ? "focus:ring-brand-primary/40 border-brand-primary"
      : "focus:ring-brand-accent/40 border-white/10";

  return (
    <div className={`w-full ${className}`}>
      <div className={`relative`}>
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">
            {leftIcon}
          </span>
        )}
        <input
          className={`w-full rounded-2xl bg-white/5 px-3 py-2 text-white placeholder:text-brand-muted
                      outline-none focus:ring-2 ${ring}
                      ${leftIcon ? "pl-10" : ""} ${rightIcon ? "pr-10" : ""}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted">
            {rightIcon}
          </span>
        )}
      </div>

      {hasError && typeof error === "string" && (
        <p className="mt-1 text-xs text-brand-danger">{error}</p>
      )}
      {hasSuccess && typeof success === "string" && (
        <p className="mt-1 text-xs text-brand-primary">{success}</p>
      )}
      {hint && !hasError && !hasSuccess && (
        <p className="mt-1 text-xs text-brand-muted">{hint}</p>
      )}
    </div>
  );
}

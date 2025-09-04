"use client";

import Spinner from "./Spinner";

const variants = {
  primary: "bg-brand-primary hover:bg-brand-primaryHover text-white border-transparent shadow-glow",
  secondary: "bg-brand-card hover:bg-white/10 text-brand-text border-white/10",
  ghost: "bg-transparent hover:bg-white/5 text-brand-text border-transparent",
  danger: "bg-brand-danger hover:bg-red-600 text-white border-transparent",
};

const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };

function cx(...c){return c.filter(Boolean).join(" ");}

export default function Button({ as:As="button", variant="primary", size="md", className="", loading=false, children, ...props }) {
  return (
    <As
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl border transition active:scale-[.99] disabled:opacity-50",
        variants[variant], sizes[size], className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </As>
  );
}

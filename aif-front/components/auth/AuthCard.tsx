import type { ReactNode } from "react";
import LoginHighlights from "@/components/auth/LoginHighlights";
import Logo, { brandDisplay } from "@/components/layout/Logo";
import { projectManager } from "@/config/projectmanager";

export default function AuthCard({
  title,
  description,
  children,
  transparent = false,
  aside,
}: {
  title: string;
  description: string;
  children: ReactNode;
  transparent?: boolean;
  aside?: ReactNode;
}) {
  const logo = (
    <Logo
      name={projectManager.app.name}
      logo={projectManager.app.logo}
      display={brandDisplay(projectManager.app.brandDisplay)}
    />
  );

  return (
    <div
      className={
        transparent
          ? "relative flex flex-1 flex-col bg-transparent"
          : "flex flex-1 items-center justify-center bg-surface px-4 py-12"
      }
    >
      {transparent ? <div className="px-6 pt-6 sm:px-8 lg:px-10">{logo}</div> : null}
      <div
        className={
          transparent
            ? "flex flex-1 flex-col justify-start gap-6 px-5 pb-6 pt-[10vh] sm:px-8 lg:px-14 xl:px-20"
            : "contents"
        }
      >
        <div
          className={
            transparent
              ? "flex w-full flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16"
              : "contents"
          }
        >
          {aside ? <div className="w-full lg:max-w-xl lg:flex-1">{aside}</div> : null}
          <div
            className={
              transparent
                ? "animate-login-card w-full max-w-md shrink-0 rounded-3xl border border-white bg-white p-7 text-foreground shadow-[0_22px_60px_rgba(15,40,80,0.28)] lg:ml-auto"
                : "w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm"
            }
          >
            {transparent ? null : logo}
          <h1 className={`${transparent ? "" : "mt-6"} text-2xl font-semibold tracking-tight`}>{title}</h1>
          <p className={`mt-2 text-sm leading-relaxed ${transparent ? "text-slate-600" : "text-muted"}`}>{description}</p>
            {children}
          </div>
        </div>
        {aside ? (
          <div className="mx-auto mt-[9vh] w-full max-w-6xl">
            <LoginHighlights />
          </div>
        ) : null}
      </div>
    </div>
  );
}

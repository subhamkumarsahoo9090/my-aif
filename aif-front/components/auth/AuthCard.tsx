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
      {transparent ? <div className="hidden px-6 pt-6 sm:px-8 lg:block lg:px-10">{logo}</div> : null}
      <div
        className={
          transparent
            ? "flex flex-1 flex-col justify-center gap-6 px-4 py-6 sm:px-8 lg:justify-start lg:px-14 lg:pb-6 lg:pt-[10vh] xl:px-20"
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
          {aside ? <div className="hidden w-full lg:block lg:max-w-xl lg:flex-1">{aside}</div> : null}
          <div
            className={
              transparent
                ? "animate-login-card w-full max-w-md shrink-0 rounded-3xl border border-white bg-white p-5 text-foreground shadow-[0_22px_60px_rgba(15,40,80,0.28)] sm:p-7 lg:ml-auto"
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
          <div className="mx-auto mt-8 hidden w-full max-w-6xl sm:mt-[9vh] lg:block">
            <LoginHighlights />
          </div>
        ) : null}
      </div>
    </div>
  );
}

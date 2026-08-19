import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { translateForLanguage } from "@/i18n/LanguageContext";
import { readCurrentLang } from "@/i18n/routing";

/**
 * Accessible name for the close button that every DialogContent renders.
 *
 * Why this isn't just `t("common.close")`: DialogContent is a shadcn primitive,
 * and `useLanguage()` THROWS when there is no <LanguageProvider> above it. Radix
 * portals do keep React context, so app dialogs would be fine — but the primitive
 * is also mounted with no provider at all (component-level unit tests, and
 * anything rendered above the router). A hook here would turn a missing provider
 * into a crash instead of a fallback. `readCurrentLang()` is the project's
 * existing provider-free resolver: it reads the /:lang URL segment first, exactly
 * as LanguageProvider does, then the stored/browser hint. So the label is right
 * with or without a provider and can never throw.
 */
function defaultCloseLabel(): string {
  return translateForLanguage(readCurrentLang(), "common.close");
}

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /**
   * Screen-reader label for the close button.
   *
   * Optional on purpose. DialogContent has ~40 call sites across the customer,
   * provider and admin surfaces; making the label required would break every one
   * of them at once for a caller-by-caller benefit we already get from the
   * default. Passing nothing still yields a translated, working accessible name
   * (see defaultCloseLabel) — pass this only when a dialog needs something more
   * specific than "Close", e.g. "Close photo".
   */
  closeLabel?: string;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, closeLabel, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
      {/* Close: the hit box used to be the 16px glyph itself, which is a miss
          waiting to happen on a phone. The transparent ::after grows the
          touchable area to 40px (16 + 12 on each side) — comfortably over the
          24px WCAG 2.5.8 minimum — while the button's own painted box is
          untouched.

          Deliberately NOT ui/sheet.tsx's h-11 w-11 + -m-3.5, which is the nicer
          form but resizes the button's visible box. QuoteLeadPhotos gives this
          button a background and a shadow ([&>button]:rounded-full bg-card), so
          growing the box there would turn a 28px pill over the photo into a
          44px one. Sheet has no caller doing that; this one does. */}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity after:absolute after:-inset-3 after:content-[''] data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X className="h-4 w-4" aria-hidden />
        <span className="sr-only">{closeLabel ?? defaultCloseLabel()}</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

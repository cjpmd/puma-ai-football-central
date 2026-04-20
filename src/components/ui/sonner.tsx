import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1a0d2e]/95 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-white group-[.toaster]:border-white/12 group-[.toaster]:shadow-2xl",
          description: "group-[.toast]:text-white/70",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-white/80",
          success:
            "group-[.toaster]:!bg-emerald-950/90 group-[.toaster]:!border-emerald-500/30 group-[.toaster]:!text-emerald-50",
          error:
            "group-[.toaster]:!bg-red-950/90 group-[.toaster]:!border-red-500/30 group-[.toaster]:!text-red-50",
          warning:
            "group-[.toaster]:!bg-amber-950/90 group-[.toaster]:!border-amber-500/30 group-[.toaster]:!text-amber-50",
          info:
            "group-[.toaster]:!bg-sky-950/90 group-[.toaster]:!border-sky-500/30 group-[.toaster]:!text-sky-50",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }

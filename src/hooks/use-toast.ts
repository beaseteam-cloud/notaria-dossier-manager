import { useState, useCallback } from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

interface State {
  toasts: ToasterToast[]
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

function useToast() {
  const [toasts, setToasts] = useState<ToasterToast[]>([])

  const toast = useCallback(({ title, description, variant, ...props }: Omit<ToasterToast, "id">) => {
    const id = genId()
    
    const newToast: ToasterToast = {
      id,
      title,
      description,
      variant,
      open: true,
      ...props,
    }

    setToasts((prevToasts) => [newToast, ...prevToasts].slice(0, TOAST_LIMIT))

    const dismiss = () => {
      setToasts((prevToasts) => prevToasts.filter(t => t.id !== id))
    }

    // Auto dismiss after delay
    setTimeout(() => {
      dismiss()
    }, TOAST_REMOVE_DELAY)

    return {
      id,
      dismiss,
      update: (props: Partial<ToasterToast>) => {
        setToasts((prevToasts) => 
          prevToasts.map(t => t.id === id ? { ...t, ...props } : t)
        )
      },
    }
  }, [])

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      setToasts((prevToasts) => prevToasts.filter(t => t.id !== toastId))
    } else {
      setToasts([])
    }
  }, [])

  return {
    toasts,
    toast,
    dismiss,
  }
}

// Standalone toast function for backwards compatibility
function toast({ title, description, variant, ...props }: Omit<ToasterToast, "id">) {
  // This is a simplified version that just logs to console for now
  console.log('Toast:', { title, description, variant })
  
  return {
    id: genId(),
    dismiss: () => {},
    update: () => {},
  }
}

export { useToast, toast }
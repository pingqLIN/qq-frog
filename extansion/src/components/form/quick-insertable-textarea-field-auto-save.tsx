import type { InsertCell } from "@/components/ui/insertable-textarea"
import { useStore } from "@tanstack/react-form"
import { useEffect, useRef, useState } from "react"
import { Field, FieldError, FieldLabel } from "@/components/ui/base-ui/field"
import { QuickInsertableTextarea } from "@/components/ui/insertable-textarea"
import { useFieldContext } from "./form-context"

const AUTO_SAVE_DELAY_MS = 350

interface QuickInsertableTextareaFieldAutoSaveProps {
  formForSubmit: { handleSubmit: () => void }
  label: React.ReactNode
  insertCells?: InsertCell[]
  className?: string
}

export function QuickInsertableTextareaFieldAutoSave({
  formForSubmit,
  label,
  insertCells,
  className,
}: QuickInsertableTextareaFieldAutoSaveProps) {
  const field = useFieldContext<string>()
  const errors = useStore(field.store, state => state.meta.errors)
  const hasError = errors.length > 0
  const [draftValue, setDraftValue] = useState(() => field.state.value ?? "")
  const [isFocused, setIsFocused] = useState(false)
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fieldValue = field.state.value ?? ""
  const renderedValue = isFocused ? draftValue : fieldValue

  useEffect(() => {
    return () => {
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current)
      }
    }
  }, [])

  const scheduleSubmit = () => {
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current)
    }

    submitTimerRef.current = setTimeout(() => {
      submitTimerRef.current = null
      void formForSubmit.handleSubmit()
    }, AUTO_SAVE_DELAY_MS)
  }

  const flushSubmit = () => {
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current)
      submitTimerRef.current = null
    }
    void formForSubmit.handleSubmit()
  }

  return (
    <Field invalid={hasError}>
      <FieldLabel>{label}</FieldLabel>
      <QuickInsertableTextarea
        value={renderedValue}
        onFocus={() => {
          setDraftValue(fieldValue)
          setIsFocused(true)
        }}
        onBlur={() => {
          setIsFocused(false)
          field.handleBlur()
          flushSubmit()
        }}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
          const nextValue = event.target.value
          setDraftValue(nextValue)
          field.handleChange(nextValue)
          scheduleSubmit()
        }}
        aria-invalid={hasError}
        className={className}
        insertCells={insertCells}
      />
      <FieldError match={hasError}>
        {errors.map(error => typeof error === "string" ? error : error?.message).join(", ")}
      </FieldError>
    </Field>
  )
}

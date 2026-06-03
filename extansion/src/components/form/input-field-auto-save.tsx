import { useStore } from "@tanstack/react-form"
import { useEffect, useRef, useState } from "react"
import { Field, FieldError, FieldLabel } from "@/components/ui/base-ui/field"
import { Input } from "@/components/ui/base-ui/input"
import { useFieldContext } from "./form-context"

const AUTO_SAVE_DELAY_MS = 350

export function InputFieldAutoSave(
  { formForSubmit, label, labelExtra, type, onBlur, onChange, onFocus, ...props }:
  { formForSubmit: { handleSubmit: () => void }, label: React.ReactNode, labelExtra?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>,
) {
  const field = useFieldContext<string | number | undefined>()
  const errors = useStore(field.store, state => state.meta.errors)
  const hasError = errors.length > 0
  const [draftValue, setDraftValue] = useState(() => field.state.value?.toString() ?? "")
  const [isFocused, setIsFocused] = useState(false)
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fieldValue = field.state.value?.toString() ?? ""
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDraftValue(value)
    onChange?.(e)

    if (type === "number") {
      if (value === "") {
        field.handleChange(undefined)
      }
      else {
        const num = Number(value)
        if (!Number.isNaN(num)) {
          field.handleChange(num)
        }
      }
    }
    else {
      field.handleChange(value)
    }

    scheduleSubmit()
  }

  return (
    <Field invalid={hasError}>
      <div className="flex items-end justify-between w-full">
        <FieldLabel nativeLabel={false} render={<div />}>
          {label}
        </FieldLabel>
        {labelExtra}
      </div>
      <Input
        id={field.name}
        type={type}
        {...props}
        value={renderedValue}
        onFocus={(event) => {
          setDraftValue(fieldValue)
          setIsFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setIsFocused(false)
          field.handleBlur()
          flushSubmit()
          onBlur?.(event)
        }}
        onChange={handleChange}
        aria-invalid={hasError}
      />
      <FieldError match={hasError}>
        {errors.map(error => typeof error === "string" ? error : error?.message).join(", ")}
      </FieldError>
    </Field>
  )
}

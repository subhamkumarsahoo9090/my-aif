"use client";

import { useEffect, useId, useRef, useState } from "react";
import { errorClass, inputClass } from "@/components/ui/classes";

const formatHint = "Only numbers in DD/MM/YYYY format";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function isoToDisplay(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function displayToIso(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const dayFirst = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(trimmed);
  const yearFirst = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const year = dayFirst ? Number(dayFirst[3]) : yearFirst ? Number(yearFirst[1]) : NaN;
  const month = dayFirst ? Number(dayFirst[2]) : yearFirst ? Number(yearFirst[2]) : NaN;
  const day = dayFirst ? Number(dayFirst[1]) : yearFirst ? Number(yearFirst[3]) : NaN;
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function inRange(iso: string, min?: string, max?: string) {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

function coerceDigits(digits: string) {
  let value = digits.slice(0, 8);
  if (value.length >= 1 && value[0] >= "4") value = (`0${value}`).slice(0, 8);
  if (value.length >= 3 && value[2] >= "2") value = (`${value.slice(0, 2)}0${value.slice(2)}`).slice(0, 8);
  return value;
}

function toDisplay(digits: string) {
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let display = day;
  if (digits.length > 2) display += `/${month}`;
  if (digits.length > 4) display += `/${year}`;
  return display;
}

function partialDateOk(digits: string) {
  if (digits.length > 8) return false;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  if (day.length === 1 && day > "3") return false;
  if (day.length === 2 && (Number(day) < 1 || Number(day) > 31)) return false;
  if (month.length === 1 && month > "1") return false;
  if (month.length === 2 && (Number(month) < 1 || Number(month) > 12)) return false;
  if (digits.length === 8 && !displayToIso(toDisplay(digits))) return false;
  return true;
}

/** Turns typed or pasted text into DD/MM/YYYY. Returns null when the edit is not a date. */
export function formatDateEntry(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/[^0-9/.\-\s]/.test(trimmed)) return null;
  const direct = displayToIso(trimmed);
  if (direct) return isoToDisplay(direct);
  const digits = coerceDigits(trimmed.replace(/\D/g, ""));
  if (!partialDateOk(digits)) return null;
  return toDisplay(digits);
}

function caretForDigits(display: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < display.length; index += 1) {
    if (/\d/.test(display[index])) {
      seen += 1;
      if (seen === digitCount) return index + 1;
    }
  }
  return display.length;
}

export default function DateField({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  required = false,
  min,
  max,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
}) {
  const autoId = useId();
  const pickerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const [text, setText] = useState(() => isoToDisplay(value ?? defaultValue));
  const [iso, setIso] = useState(value ?? defaultValue);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (value === undefined) return;
    setIso(value);
    setText((current) => {
      if (value) return isoToDisplay(value);
      if (!current) return "";
      const parsed = displayToIso(current);
      if (!parsed || !inRange(parsed, min, max)) return current;
      return "";
    });
  }, [value, min, max]);

  useEffect(() => {
    if (caretDigits.current === null) return;
    const field = textRef.current;
    if (!field) return;
    const position = caretForDigits(text, caretDigits.current);
    field.setSelectionRange(position, position);
    caretDigits.current = null;
  }, [text]);

  useEffect(() => {
    const field = textRef.current;
    if (!field) return;
    if (!text) {
      field.setCustomValidity("");
      return;
    }
    const parsed = displayToIso(text);
    field.setCustomValidity(parsed && inRange(parsed, min, max) ? "" : formatHint);
  }, [text, min, max]);

  function commit(nextIso: string, nextText?: string) {
    setIso(nextIso);
    setText(nextText ?? (nextIso ? isoToDisplay(nextIso) : ""));
    onChange?.(nextIso);
  }

  function onTextChange(raw: string, caret: number) {
    const next = formatDateEntry(raw);
    if (next === null) {
      setHint(formatHint);
      return;
    }
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, "").length;
    const rawDigits = raw.replace(/\D/g, "").length;
    const nextDigits = next.replace(/\D/g, "").length;
    caretDigits.current = digitsBeforeCaret + Math.max(0, nextDigits - rawDigits);
    const parsed = displayToIso(next);
    if (parsed && !inRange(parsed, min, max)) {
      setHint(formatHint);
      commit("", next);
      return;
    }
    setHint("");
    if (parsed) commit(parsed, next);
    else commit("", next);
  }

  function openCalendar() {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") {
      try {
        picker.showPicker();
        return;
      } catch {
        // Some browsers only open the calendar after the control is focused.
      }
    }
    picker.focus();
  }

  return (
    <div>
      <div className="relative">
        <input
          ref={textRef}
          id={id ?? autoId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="DD/MM/YYYY"
          maxLength={10}
          required={required}
          aria-invalid={hint ? true : undefined}
          value={text}
          onFocus={() => setHint("")}
          onKeyDown={(event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key.length === 1 && !/^\d$/.test(event.key)) {
              event.preventDefault();
              setHint(formatHint);
            }
          }}
          onBeforeInput={(event) => {
            const data = (event.nativeEvent as InputEvent).data;
            if (data && /[^0-9/.\-\s]/.test(data)) {
              event.preventDefault();
              setHint(formatHint);
            }
          }}
          onChange={(event) => onTextChange(event.target.value, event.target.selectionStart ?? event.target.value.length)}
          onBlur={() => {
            const parsed = displayToIso(text);
            if (parsed && inRange(parsed, min, max)) {
              setHint("");
              commit(parsed);
              return;
            }
            if (parsed) {
              setHint(formatHint);
              return;
            }
            const keep = iso && inRange(iso, min, max) ? iso : "";
            setHint("");
            commit(keep, keep ? isoToDisplay(keep) : "");
          }}
          className={`${className ?? inputClass} pr-10`}
        />
        <button
          type="button"
          aria-label="Open calendar"
          onClick={openCalendar}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
          </svg>
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          value={iso}
          min={min}
          max={max}
          onChange={(event) => {
            setHint("");
            commit(event.target.value);
          }}
          className="pointer-events-none absolute h-px w-px opacity-0"
          aria-hidden="true"
        />
        {name ? <input type="hidden" name={name} value={iso} /> : null}
      </div>
      {hint ? <span className={`mt-1 block ${errorClass}`}>{hint}</span> : null}
    </div>
  );
}

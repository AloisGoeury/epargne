import { useEffect, useState } from "react";
import { decimalInputValue, numberValue } from "../utils/numberInput";

type DecimalInputProps = {
  value: number | undefined;
  onCommit: (nextValue: number) => void;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
};

export function DecimalInput({ value, onCommit, inputMode = "decimal", placeholder }: DecimalInputProps) {
  const [draft, setDraft] = useState(decimalInputValue(value));

  useEffect(() => {
    setDraft(decimalInputValue(value));
  }, [value]);

  const commit = () => {
    onCommit(numberValue(draft));
  };

  return (
    <input
      value={draft}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

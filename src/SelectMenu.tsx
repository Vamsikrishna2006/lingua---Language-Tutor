import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface MenuOption {
  value: string;
  label: string;
  mark?: string;
}

interface SelectMenuProps {
  label: string;
  value: string;
  options: MenuOption[];
  onChange: (value: string) => void;
}

export function SelectMenu({
  label,
  value,
  options,
  onChange,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function closeWhenClickingAway(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeWhenClickingAway);
    return () =>
      document.removeEventListener("mousedown", closeWhenClickingAway);
  }, []);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className="menu-field" ref={root}>
      <small>{label}</small>
      <motion.button
        type="button"
        className="menu-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.98 }}
      >
        {selected.mark && (
          <span className="language-mark">{selected.mark}</span>
        )}
        <span>{selected.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.35 }}
        >
          <ChevronDown size={15} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="menu-popover"
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {options.map((option, index) => (
              <motion.button
                type="button"
                role="option"
                aria-selected={option.value === value}
                key={option.value}
                onClick={() => choose(option.value)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.055, duration: 0.28 }}
                whileHover={{ x: 5 }}
              >
                {option.mark && (
                  <span className="language-mark">{option.mark}</span>
                )}
                <span>{option.label}</span>
                {option.value === value && <Check size={14} />}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

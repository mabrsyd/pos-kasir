import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Option {
  value: string;
  label: string;
}

interface SearchableDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onAddNew?: () => void;
  addNewText?: string;
}

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  emptyText = 'Tidak ditemukan.',
  onAddNew,
  addNewText
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Fokus ke search input saat popover terbuka
  useEffect(() => {
    if (open && showSearch) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!open) setSearch('');
  }, [open]);

  const showSearch = options.length > 15;

  const filtered = search
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
  };

  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left"
        >
          {selectedLabel
            ? selectedLabel
            : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 bg-white border border-border shadow-lg rounded-md z-[200]"
        align="start"
        sideOffset={4}
        // Mencegah blur / focus-steal saat klik di dalam popover
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {showSearch && (
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-40" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        <div className="max-h-[250px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.value}
                // Gunakan onMouseDown bukan onClick agar fire sebelum focus-trap Dialog
                onMouseDown={(e) => {
                  e.preventDefault(); // cegah blur sebelum handler jalan
                  handleSelect(opt.value);
                }}
                className={cn(
                  'flex items-center px-3 py-2 text-sm cursor-pointer select-none rounded-sm mx-1',
                  'hover:bg-zinc-100 active:bg-zinc-200',
                  value === opt.value && 'bg-zinc-100 font-medium'
                )}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4 flex-shrink-0',
                    value === opt.value ? 'opacity-100 text-primary' : 'opacity-0'
                  )}
                />
                {opt.label}
              </div>
            ))
          )}

          {onAddNew && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                onAddNew();
              }}
              className="flex items-center px-3 py-3 text-sm text-primary font-semibold cursor-pointer select-none border-t border-border mt-1 hover:bg-zinc-50 active:bg-zinc-100 mx-0 rounded-none"
            >
              {addNewText}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

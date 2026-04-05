"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

interface Option {
    value: string;
    label: string;
    group?: string;
}

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    className?: string;
}

export function CustomSelect({
    options,
    value,
    onChange,
    placeholder = "Select option...",
    searchable = true,
    disabled = false,
    className = ""
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);

    const filteredOptions = options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.group && o.group.toLowerCase().includes(search.toLowerCase()))
    );

    // Group options
    const groups = Array.from(new Set(filteredOptions.map(o => o.group))).filter(Boolean) as string[];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-black/40 border rounded-xl transition-all duration-300 text-sm
                    ${isOpen ? "border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-primary/50" : "border-white/10 hover:border-white/20"}
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
            >
                <span className={selectedOption ? "text-white" : "text-muted-foreground italic"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 glass-card border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {searchable && (
                        <div className="p-2 border-b border-white/5 bg-white/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {groups.length > 0 ? (
                            groups.map(group => (
                                <div key={group}>
                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-white/5">
                                        {group}
                                    </div>
                                    {filteredOptions.filter(o => o.group === group).map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleSelect(option.value)}
                                            className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-primary/20 transition-colors text-left
                                                ${value === option.value ? "text-primary font-bold bg-primary/10" : "text-slate-300"}
                                            `}
                                        >
                                            {option.label}
                                            {value === option.value && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    ))}
                                </div>
                            ))
                        ) : (
                            filteredOptions.filter(o => !o.group).map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-primary/20 transition-colors text-left
                                        ${value === option.value ? "text-primary font-bold bg-primary/10" : "text-slate-300"}
                                    `}
                                >
                                    {option.label}
                                    {value === option.value && <Check className="w-3.5 h-3.5" />}
                                </button>
                            ))
                        )}
                        
                        {filteredOptions.length === 0 && (
                            <div className="px-4 py-8 text-center text-xs text-muted-foreground italic">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

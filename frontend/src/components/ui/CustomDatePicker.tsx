"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
}

export function CustomDatePicker({ value, onChange, label }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or fallback to today
  const initialDate = value ? new Date(value) : new Date();
  
  // viewDate should be the 1st of the month currently being viewed
  const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const isSelected = (day: number) => {
    if (!value) return false;
    const parts = value.split('-');
    const dYear = parseInt(parts[0]);
    const dMonth = parseInt(parts[1]) - 1;
    const dDay = parseInt(parts[2]);
    return dYear === currentYear && dMonth === currentMonth && dDay === day;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{label}</p>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 bg-white/5 border rounded-lg text-foreground cursor-pointer transition-all duration-300",
          isOpen ? "border-primary ring-2 ring-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-white/10" : "border-border hover:border-primary/50 hover:bg-white/10"
        )}
      >
        <CalendarIcon className={cn("w-4 h-4 text-primary transition-transform duration-300", isOpen && "scale-110")} />
        <span className="font-mono text-sm tracking-tight flex-1">
          {value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "Select period ending..."}
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-80 bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-[100] p-5 animate-in fade-in zoom-in-95 duration-200 origin-top">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-white transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-white tracking-tight">
                {monthNames[currentMonth]}
              </span>
              <span className="text-[10px] uppercase font-black tracking-widest text-primary/70">
                {currentYear}
              </span>
            </div>
            <button 
              onClick={handleNextMonth}
              className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-white transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 mb-3">
            {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map(day => (
              <div key={day} className="text-center text-[9px] font-black tracking-widest text-muted-foreground/30 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}
            
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);
              
              return (
                <button
                  key={day}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDateSelect(day);
                  }}
                  className={cn(
                    "h-9 flex items-center justify-center rounded-xl text-xs font-mono transition-all duration-300 relative group",
                    selected 
                      ? "bg-primary text-white font-black shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-105" 
                      : "text-slate-400 hover:bg-white/10 hover:text-white",
                    today && !selected && "text-primary font-black scale-110"
                  )}
                >
                  {day}
                  {today && !selected && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full animate-pulse shadow-[0_0_5px_rgba(59,130,246,1)]" />
                  )}
                  {!selected && !today && (
                     <div className="absolute inset-0 border border-white/0 group-hover:border-white/5 rounded-xl transition-all" />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-white/5 flex justify-between items-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const now = new Date();
                setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-[9px] uppercase font-black text-primary tracking-widest hover:bg-primary/20 transition-all active:scale-95"
            >
              Today
            </button>
            <div className="text-[9px] text-muted-foreground/30 font-black tracking-[0.2em] uppercase">
              Financial Suite
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

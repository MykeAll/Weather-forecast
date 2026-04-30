import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Mic, MicOff } from 'lucide-react';
import { searchLocations } from '../services/weatherService';
import { SearchSuggestion } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SearchBarProps {
  onSelect: (suggestion: SearchSuggestion) => void;
  onLocate: () => void;
  isAtmosphereMode?: boolean;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelect, onLocate, isAtmosphereMode = true }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support speech recognition.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        try {
          const results = await searchLocations(query);
          setSuggestions(results);
          setIsOpen(true);
        } catch (error) {
          console.error('Search failed', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto z-50">
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/50 group-focus-within:text-white transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isListening ? "Listening..." : "Search for a city..."}
          style={{ borderWidth: '2.8px' }}
          className={cn(
            "w-full h-14 pl-10 sm:pl-12 pr-20 sm:pr-24 rounded-2xl text-white placeholder:text-white/40 placeholder:text-sm sm:placeholder:text-base focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all duration-700 cursor-text",
            isAtmosphereMode 
              ? "bg-white/10 backdrop-blur-md border border-white/20 shadow-xl" 
              : "bg-black/20 backdrop-blur-xl border border-white/10",
            isListening && "ring-2 ring-sky-500 bg-white/20"
          )}
        />
        <div className="absolute inset-y-0 right-4 flex items-center gap-2 sm:gap-3">
          <button
            onClick={startVoiceSearch}
            className={cn(
              "flex items-center transition-colors cursor-pointer p-2 rounded-lg hover:bg-white/5",
              isListening ? "text-sky-400" : "text-white/50 hover:text-white"
            )}
            title="Search by voice"
          >
            {isListening ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.div>
            ) : (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
          <button
            onClick={onLocate}
            className="flex items-center text-white/50 hover:text-white transition-colors cursor-pointer p-2 rounded-lg hover:bg-white/5"
            title="Use current location"
          >
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(isOpen || isLoading) && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-3 bg-[#111]/90 backdrop-blur-2xl border border-white/10 rounded-[28px] overflow-hidden shadow-2xl z-50 p-2"
          >
            {isLoading ? (
              <div className="space-y-1">
                {[...Array(3)].map((_, i) => (
                  <li key={i} className="flex flex-col gap-2 p-4 rounded-2xl animate-pulse">
                    <div className="h-5 bg-white/10 rounded-lg w-1/3" />
                    <div className="h-3 bg-white/5 rounded-lg w-1/2" />
                  </li>
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((item, index) => (
                <li key={`${item.lat}-${item.lon}`}>
                  <button
                    onClick={() => {
                      onSelect(item);
                      setQuery('');
                      setIsOpen(false);
                    }}
                    className="w-full px-5 py-4 text-left text-white/90 hover:bg-white/10 rounded-2xl transition-all flex flex-col group cursor-pointer"
                  >
                    <span className="font-bold text-base group-hover:translate-x-1 transition-transform">{item.name}</span>
                    <span className="text-[11px] uppercase tracking-wider font-black text-white/30 group-hover:text-white/50 group-hover:translate-x-1 transition-all">
                      {item.admin1 ? `${item.admin1}, ` : ''}{item.country}
                    </span>
                  </button>
                </li>
              ))
            ) : null}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

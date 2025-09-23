"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface CountrySelectorProps {
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  disabled?: boolean;
}

export default function CountrySelector({
  selectedCountry,
  onCountryChange,
  disabled = false
}: CountrySelectorProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/countries');
      const data = await response.json();

      if (data.success) {
        setCountries(data.data.countries);
      }
    } catch (error) {
      console.error('Failed to fetch countries:', error);
      // Fallback countries
      setCountries([
        { code: 'us', name: 'United States', flag: '🇺🇸' },
        { code: 'fr', name: 'France', flag: '🇫🇷' },
        { code: 'ca', name: 'Canada', flag: '🇨🇦' },
        { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
        { code: 'de', name: 'Germany', flag: '🇩🇪' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCountryData = countries.find(c => c.code === selectedCountry);

  const handleCountrySelect = (countryCode: string) => {
    onCountryChange(countryCode);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
        <GlobeAltIcon className="h-5 w-5 text-gray-400" />
        <div className="h-4 w-20 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selected Country Button */}
      <motion.button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-3 rounded-lg border px-4 py-2 transition-all
          ${disabled
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:shadow-md dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300'
          }
        `}
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
      >
        <span className="text-lg">{selectedCountryData?.flag || '🌍'}</span>
        <span className="font-medium">{selectedCountryData?.name || 'Select Country'}</span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              className="absolute top-full left-0 z-20 mt-2 w-full min-w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-900"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="py-1">
                {countries.map((country, index) => (
                  <motion.button
                    key={country.code}
                    onClick={() => handleCountrySelect(country.code)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                      ${selectedCountry === country.code
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                      }
                    `}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: selectedCountry === country.code ? undefined : 'rgb(249 250 251)' }}
                  >
                    <span className="text-lg">{country.flag}</span>
                    <span className="font-medium">{country.name}</span>
                    {selectedCountry === country.code && (
                      <motion.div
                        className="ml-auto h-2 w-2 rounded-full bg-red-500"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
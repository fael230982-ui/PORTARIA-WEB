'use client';

import { useState } from 'react';

const STORAGE_KEY = 'visitor-document-required';

export function readVisitorDocumentRequired() {
  if (typeof window === 'undefined') return true;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export function writeVisitorDocumentRequired(value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, String(value));
}

export function useVisitorDocumentRequirement() {
  const [required, setRequired] = useState(readVisitorDocumentRequired);

  const updateRequired = (value: boolean) => {
    setRequired(value);
    writeVisitorDocumentRequired(value);
  };

  return { required, setRequired: updateRequired };
}

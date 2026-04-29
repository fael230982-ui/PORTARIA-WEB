'use client';

import { useEffect } from 'react';

const EXCLUDED_TYPES = new Set([
  'password',
  'email',
  'url',
  'number',
  'checkbox',
  'radio',
  'date',
  'datetime-local',
  'time',
  'month',
  'week',
  'hidden',
  'file',
]);

const EXCLUDED_HINTS = [
  'message',
  'mensagem',
  'relatorio',
  'relatório',
  'resolucao',
  'resolução',
  'observacao',
  'observação',
  'turno',
  'descricao',
  'descrição',
  'comment',
  'notes',
  'body',
  'email',
  'e-mail',
  'senha',
  'password',
  'token',
  'url',
  'stream',
  'snapshot',
  'rtsp',
  'baseurl',
  'webhook',
  'username',
  'usuário',
  'usuario',
  'login',
  'host',
  'path',
  'arquivo',
  'file',
];

function hasExcludedHint(value?: string | null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return EXCLUDED_HINTS.some((hint) => normalized.includes(hint));
}

function shouldSkip(target: HTMLInputElement | HTMLTextAreaElement) {
  if (target.dataset.preserveCase === 'true') return true;
  if (target.readOnly || target.disabled) return true;
  if (target instanceof HTMLInputElement && EXCLUDED_TYPES.has((target.type || 'text').toLowerCase())) return true;

  return (
    hasExcludedHint(target.name) ||
    hasExcludedHint(target.id) ||
    hasExcludedHint(target.placeholder) ||
    hasExcludedHint(target.getAttribute('aria-label')) ||
    hasExcludedHint(target.autocomplete)
  );
}

export function UppercaseInputGuard() {
  useEffect(() => {
    function normalizeField(target: HTMLInputElement | HTMLTextAreaElement) {
      if (shouldSkip(target)) return;

      const nextValue = target.value.toUpperCase();
      if (nextValue === target.value) return;

      const supportsSelection =
        target instanceof HTMLInputElement
          ? !['checkbox', 'radio', 'range', 'color', 'file'].includes((target.type || 'text').toLowerCase())
          : true;
      const selectionStart = supportsSelection ? target.selectionStart : null;
      const selectionEnd = supportsSelection ? target.selectionEnd : null;

      target.value = nextValue;
      if (supportsSelection && selectionStart !== null && selectionEnd !== null) {
        target.setSelectionRange(selectionStart, selectionEnd);
      }
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function handleInput(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      normalizeField(target);
    }

    function handleSubmit(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      form.querySelectorAll('input, textarea').forEach((element) => {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          normalizeField(element);
        }
      });
    }

    document.addEventListener('input', handleInput, true);
    document.addEventListener('change', handleInput, true);
    document.addEventListener('blur', handleInput, true);
    document.addEventListener('submit', handleSubmit, true);

    return () => {
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('change', handleInput, true);
      document.removeEventListener('blur', handleInput, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, []);

  return null;
}

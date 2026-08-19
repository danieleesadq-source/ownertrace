import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { EntityDetails } from '@/lib/types';
import { DossierContent } from './DossierContent';
import { DossierSkeleton } from './DossierSkeleton';

interface DossierPanelProps {
  entity: EntityDetails | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
}

export function DossierPanel({ entity, isOpen, isLoading, onClose }: DossierPanelProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' }}
          className="absolute right-0 top-0 bottom-0 w-full max-w-sm md:w-[380px] bg-surface border-l border-border z-20 shadow-[-8px_0_32px_-12px_rgba(0,0,0,0.5)]"
        >
          {entity ? <DossierContent entity={entity} onClose={onClose} /> : isLoading ? <DossierSkeleton /> : null}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

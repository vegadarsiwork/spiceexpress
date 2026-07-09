import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  lightMode?: boolean;
}

const backdropVariants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function Modal({ open, onClose, children, lightMode = false }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          onClick={onClose}
        >
          <motion.div
            className={`${lightMode ? 'bg-white' : 'bg-white dark:bg-slate-950'} rounded-xl shadow-xl mx-4 relative`}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => e.stopPropagation()}
          >
            <button
              className={`absolute top-3 right-3 ${lightMode ? 'text-gray-400 hover:text-gray-700' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

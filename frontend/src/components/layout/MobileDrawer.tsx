import React from 'react';
import { Drawer } from 'vaul';

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  trigger?: React.ReactNode;
}

export function MobileDrawer({ open, onOpenChange, title, children, trigger }: MobileDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Drawer.Content className="bg-surface flex flex-col rounded-t-[10px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-border focus:outline-none">
          <div className="p-4 bg-surface rounded-t-[10px] flex-1 overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-border mb-8" />
            {title && (
              <Drawer.Title className="font-display text-xl text-text-primary mb-4">
                {title}
              </Drawer.Title>
            )}
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

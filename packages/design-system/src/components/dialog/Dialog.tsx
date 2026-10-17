'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../utils';
import { Button, type ButtonProps } from '../button';
import { TextButton } from '../textButton';

export type DialogRootProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  children: ReactNode;
};
export type DialogContentProps = ComponentProps<'div'>;
export type DialogTitleProps = ComponentProps<'h2'>;
export type DialogDescriptionProps = ComponentProps<'p'>;
export type DialogFooterProps = ComponentProps<'div'>;
export type DialogActionProps = Omit<ButtonProps, 'variant'> & {
  appearance?: 'solid' | 'text';
  variant?: 'primary' | 'secondary' | 'warning';
};

const Root = ({ open, onOpenChange, children }: DialogRootProps) => (
  <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
    {children}
  </AlertDialog.Root>
);

const Content = ({ className, children, ref, ...props }: DialogContentProps) => {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="bg-overlay-scrim fixed inset-0" />
      <AlertDialog.Popup
        {...props}
        aria-modal="true"
        ref={(element) => {
          popupRef.current = element;
          if (typeof ref === 'function') return ref(element);
          if (ref) ref.current = element;
        }}
        initialFocus={() =>
          popupRef.current?.querySelector<HTMLElement>('[data-dialog-cancel]:not(:disabled)') ??
          popupRef.current?.querySelector<HTMLElement>('[data-dialog-confirm]:not(:disabled)') ??
          popupRef.current
        }
        className={cn(
          'bg-surface-primary rounded-r9 fixed top-1/2 left-1/2 flex max-h-[min(640px,calc(100dvh-32px))] w-[311px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto outline-none',
          className,
        )}
      >
        {children}
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  );
};

const Title = ({ className, ...props }: DialogTitleProps) => (
  <AlertDialog.Title
    {...props}
    className={cn(
      'px-padding-p11 pt-padding-p11 text-text-primary typography-heading-1-semibold break-words',
      className,
    )}
  />
);
const Description = ({ className, ...props }: DialogDescriptionProps) => (
  <AlertDialog.Description
    {...props}
    className={cn(
      'px-padding-p11 mt-s4 text-text-tertiary typography-body-1-regular break-words',
      className,
    )}
  />
);
const Footer = ({ className, ...props }: DialogFooterProps) => (
  <div
    {...props}
    className={cn('gap-s4 p-padding-p8 pt-padding-p10 flex shrink-0 justify-end', className)}
  />
);
const Cancel = ({ appearance = 'solid', variant, ...props }: DialogActionProps) => (
  <AlertDialog.Close
    data-dialog-cancel=""
    render={
      appearance === 'text' ? (
        <TextButton children={props.children} variant={variant ?? 'secondary'} />
      ) : (
        <Button children={props.children} variant={variant ?? 'secondary'} />
      )
    }
    {...props}
  />
);
const Confirm = ({ appearance = 'solid', variant, ...props }: DialogActionProps) =>
  appearance === 'text' ? (
    <TextButton data-dialog-confirm="" variant={variant ?? 'secondary'} {...props} />
  ) : (
    <Button data-dialog-confirm="" variant={variant ?? 'primary'} {...props} />
  );

// eslint-disable-next-line react-refresh/only-export-components -- Compound API 부품 구성
export const Dialog = { Root, Content, Title, Description, Footer, Cancel, Confirm };

export type ConfirmDialogProps = Omit<DialogRootProps, 'children'> & {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  appearance?: 'solid' | 'text';
  confirmDisabled?: boolean;
};
export const ConfirmDialog = ({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  appearance = 'solid',
  confirmDisabled,
  open,
  onOpenChange,
}: ConfirmDialogProps) => (
  <Root
    open={open}
    onOpenChange={(nextOpen) => {
      if (!nextOpen) onCancel?.();
      onOpenChange(nextOpen);
    }}
  >
    <Content>
      <Title>{title}</Title>
      {description ? <Description>{description}</Description> : null}
      <Footer>
        {cancelLabel ? (
          <Cancel
            appearance={appearance}
            className={appearance === 'solid' ? 'min-w-0 flex-1' : undefined}
          >
            {cancelLabel}
          </Cancel>
        ) : null}
        <Confirm
          appearance={appearance}
          disabled={confirmDisabled}
          onClick={onConfirm}
          className={appearance === 'solid' ? 'min-w-0 flex-1' : undefined}
        >
          {confirmLabel}
        </Confirm>
      </Footer>
    </Content>
  </Root>
);

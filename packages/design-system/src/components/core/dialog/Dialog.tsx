'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../../utils';
import { Button, type ButtonProps } from '../button';
import { TextButton } from '../textButton';

export type DialogRootProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onOpenChangeComplete?: ((_open: boolean) => void) | undefined;
  children: ReactNode;
};
export type DialogContentProps = ComponentProps<'div'> & {
  backdropClassName?: string;
};
export type DialogMediaProps = ComponentProps<'div'>;
export type DialogTitleProps = ComponentProps<'h2'>;
export type DialogDescriptionProps = ComponentProps<'p'>;
export type DialogFooterProps = ComponentProps<'div'>;
export type DialogActionProps = Omit<ButtonProps, 'variant'> & {
  appearance?: 'solid' | 'text';
  variant?: 'primary' | 'secondary' | 'warning';
};

const Root = ({ open, onOpenChange, onOpenChangeComplete, children }: DialogRootProps) => (
  <AlertDialog.Root
    open={open}
    onOpenChange={onOpenChange}
    onOpenChangeComplete={onOpenChangeComplete}
  >
    {children}
  </AlertDialog.Root>
);

const Content = ({ className, backdropClassName, children, ref, ...props }: DialogContentProps) => {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <AlertDialog.Portal>
      <AlertDialog.Backdrop
        className={cn('bg-overlay-dim-subtle fixed inset-0', backdropClassName)}
      />
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
          'bg-surface-primary rounded-r9 fixed top-1/2 left-1/2 flex max-h-[min(640px,calc(100dvh-32px))] w-77.75 max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto outline-none',
          className,
        )}
      >
        {children}
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  );
};

// 제목 위 56px 원형 이미지 자리(Figma Profile 변형). 이미지는 호출자가 children으로 전달
const Media = ({ className, ...props }: DialogMediaProps) => (
  <div
    {...props}
    className={cn(
      'mx-padding-p11 mt-padding-p8 size-14 shrink-0 overflow-hidden rounded-full [&>img]:size-full [&>img]:object-cover',
      className,
    )}
  />
);
const Title = ({ className, ...props }: DialogTitleProps) => (
  <AlertDialog.Title
    {...props}
    className={cn(
      'px-padding-p11 pt-padding-p11 text-text-primary typography-heading-1-semibold wrap-break-word break-keep',
      className,
    )}
  />
);
const Description = ({ className, ...props }: DialogDescriptionProps) => (
  <AlertDialog.Description
    {...props}
    className={cn(
      'px-padding-p11 mt-s4 text-text-tertiary typography-body-1-regular wrap-break-word break-keep',
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
export const Dialog = { Root, Content, Media, Title, Description, Footer, Cancel, Confirm };

export type ConfirmDialogProps = Omit<DialogRootProps, 'children'> & {
  title: string;
  description?: string;
  /** 제목 위 프로필 이미지(Figma Profile (Side by Side)) */
  image?: ReactNode;
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
  image,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  appearance = 'solid',
  confirmDisabled,
  open,
  onOpenChange,
  onOpenChangeComplete,
}: ConfirmDialogProps) => (
  <Root
    open={open}
    onOpenChangeComplete={onOpenChangeComplete}
    onOpenChange={(nextOpen) => {
      if (!nextOpen) onCancel?.();
      onOpenChange(nextOpen);
    }}
  >
    <Content>
      {image ? <Media>{image}</Media> : null}
      {/* 이미지가 있으면 Figma Profile 간격(이미지·제목·설명 사이 6px) 적용 */}
      <Title className={image ? 'pt-s3' : undefined}>{title}</Title>
      {description ? (
        <Description className={image ? 'mt-s3' : undefined}>{description}</Description>
      ) : null}
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

export type ActionDialogAction = {
  label: string;
  onClick: () => void;
  /** 기본값은 순서대로 primary·secondary·tertiary(Figma Profile (Stack)) */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'warning';
  disabled?: boolean;
};
export type ActionDialogProps = Omit<DialogRootProps, 'children'> & {
  title: string;
  description?: string;
  /** 제목 위 프로필 이미지 */
  image?: ReactNode;
  /** 세로로 쌓는 동작 버튼. 누르면 onClick만 호출(닫기는 호출자 담당) */
  actions: ActionDialogAction[];
  /** 맨 아래 텍스트 버튼. 기본값 `취소` */
  cancelLabel?: string;
  onCancel?: () => void;
};
const defaultActionVariants = ['primary', 'secondary', 'tertiary'] as const;

/**
 * 여러 동작 중 하나를 고르는 확인창(Figma Dialog `Profile (Stack)`)
 * 버튼 세로 배치 + 맨 아래 「취소」, 첫 초점은 「취소」(ConfirmDialog와 같은 안전 정책)
 */
export const ActionDialog = ({
  title,
  description,
  image,
  actions,
  cancelLabel = '취소',
  onCancel,
  open,
  onOpenChange,
  onOpenChangeComplete,
}: ActionDialogProps) => (
  <Root
    open={open}
    onOpenChangeComplete={onOpenChangeComplete}
    onOpenChange={(nextOpen) => {
      if (!nextOpen) onCancel?.();
      onOpenChange(nextOpen);
    }}
  >
    {/* Figma Stack: 위아래 16px·좌우 22px(내용 폭 267px), 내용·버튼 사이 24px */}
    <Content className="px-padding-p11 py-padding-p8">
      {image ? <Media className="my-padding-p4 mx-0">{image}</Media> : null}
      <Title className="pt-s3 px-0">{title}</Title>
      {description ? <Description className="mt-s3 px-0">{description}</Description> : null}
      <Footer className="mt-s12 flex-col p-0">
        {actions.map((action, index) => (
          <Button
            key={`${index}-${action.label}`}
            data-dialog-confirm=""
            variant={action.variant ?? defaultActionVariants[index] ?? 'tertiary'}
            className="w-full"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
        <Cancel appearance="text" className="text-text-tertiary w-full">
          {cancelLabel}
        </Cancel>
      </Footer>
    </Content>
  </Root>
);

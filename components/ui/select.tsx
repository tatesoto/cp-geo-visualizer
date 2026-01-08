import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
            'flex h-7 items-center justify-between gap-2 rounded-lg border border-gray-200/80 bg-white px-2 text-xs text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 data-[placeholder]:text-gray-400',
            className
        )}
        {...props}
    >
        <span className="flex min-w-0 items-center gap-1.5">{children}</span>
        <SelectPrimitive.Icon asChild>
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" />
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            className={cn(
                'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-gray-200 bg-white text-xs shadow-lg',
                className
            )}
            position={position}
            sideOffset={6}
            {...props}
        >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1">
                <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport
                className={cn(
                    'p-1',
                    position === 'popper' && 'min-w-[var(--radix-select-trigger-width)]'
                )}
            >
                {children}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1">
                <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
            </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={cn(
            'relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-xs text-gray-700 outline-none focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            className
        )}
        {...props}
    >
        <SelectPrimitive.ItemText className="truncate pr-6">{children}</SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex h-3.5 w-3.5 items-center justify-center text-gray-400">
            <CheckIcon className="h-3.5 w-3.5" />
        </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
        ref={ref}
        className={cn('-mx-1 my-1 h-px bg-gray-100', className)}
        {...props}
    />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectSeparator
};

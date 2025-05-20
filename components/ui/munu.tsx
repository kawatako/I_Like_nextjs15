// components/ui/menu.tsx
"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils/cn"; // className 結合ユーティリティ

export const Menu = DropdownMenu.Root;

export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  className,
  sideOffset = 4,
  ...props
}: DropdownMenu.DropdownMenuContentProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        className={cn(
          "min-w-[160px] rounded-md bg-white p-1 shadow-md border border-gray-200",
          className
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

interface MenuItemProps extends DropdownMenu.DropdownMenuItemProps {
  /** true のとき左側にインデントを付与 */
  inset?: boolean;
}

export const MenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Item>,
  MenuItemProps
>(({ className, inset, ...props }, ref) => {
  return (
    <DropdownMenu.Item
      ref={ref}
      className={cn(
        "group flex w-full cursor-default select-none items-center rounded-sm px-2 py-1 text-sm outline-none focus:bg-gray-100",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
});
MenuItem.displayName = "MenuItem";

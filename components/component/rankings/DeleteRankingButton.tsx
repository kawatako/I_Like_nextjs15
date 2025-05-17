// components/component/rankings/DeleteRankingButton.tsx
"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/component/Icons";
import { deleteRankingListAction } from "@/lib/actions/rankingActions";
import { useRouter } from "next/navigation";

interface Props {
  listId: string;
}

export function DeleteRankingButton({ listId }: Props) {
  const router = useRouter();

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button variant="destructive" size="sm">
          <TrashIcon className="mr-1 h-4 w-4" />
          削除
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded bg-white p-6 shadow-lg">
          <AlertDialog.Title className="text-lg font-bold">
            ランキングを削除
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600">
            本当にこのランキングを削除しますか？一度削除すると元に戻せません。
          </AlertDialog.Description>
          <form
            action={async (formData: FormData) => {
              await deleteRankingListAction(null, formData);
            }}
            className="mt-6 flex justify-end space-x-2"
          >
            <input type="hidden" name="listId" value={listId} />
            <AlertDialog.Cancel asChild>
              <Button variant="outline">キャンセル</Button>
            </AlertDialog.Cancel>
            <Button variant="destructive" type="submit">
              削除する
            </Button>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

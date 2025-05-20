// components/rankings/common/RankingFormActions.tsx
// 保存ボタンと下書き保存ボタンをまとめたフッターアクションコンポーネント

import React, { FC } from "react";
import { Button } from "@/components/ui/button";

// Props: フッターのアクションボタンに必要なハンドラと状態
type Props = {
  onSaveDraft: () => void;
  onSavePublish: () => void;
  disabled: boolean;
};

// RankingFormActions: 下書き保存／公開保存を行うボタン群
export const RankingFormActions: FC<Props> = ({ onSaveDraft, onSavePublish, disabled }) => (
  <div className="flex justify-end space-x-2">
    <Button variant="outline" onClick={onSaveDraft} disabled={disabled}>
      下書き保存
    </Button>
    <Button onClick={onSavePublish} disabled={disabled}>
      保存して公開
    </Button>
  </div>
);
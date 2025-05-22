// components/rankings/common/RankingBasicInfo.tsx
// ランキング作成／編集画面の「タイトル、説明、タグ入力」セクションを提供するコンポーネント

import React, { FC } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TagInput from "./TagInput";
import { Combobox } from "@headlessui/react";
import { ChevronsUpDown } from "lucide-react";

// Props: ランキング基本情報入力に必要な state とハンドラ
interface Props {
  subject: string; // 選択済みのタイトル
  subjectQuery: string; // 入力中のクエリ
  onSubjectChange: (val: string) => void; // 候補選択時に selected を更新
  onSubjectQueryChange: (q: string) => void; // 入力時に query を更新
  subjectOptions: string[];
  isSubjectLoading: boolean;
  description: string;
  onDescriptionChange: (v: string) => void;
  tags: string[];
  onTagsChange: (t: string[]) => void;
  disabled: boolean;
}

// RankingBasicInfo: タイトル、説明、タグ入力の UI パネル
export const RankingBasicInfo: FC<Props> = ({
  subject,
  subjectQuery,
  onSubjectChange,
  onSubjectQueryChange,
  subjectOptions,
  isSubjectLoading,
  description,
  onDescriptionChange,
  tags,
  onTagsChange,
  disabled,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>ランキング基本情報</CardTitle>
      <CardDescription>タイトル、説明、タグを設定します。</CardDescription>
    </CardHeader>
    <CardContent className='space-y-4'>
      <div>
        <Label htmlFor='subject'>タイトル*</Label>
        <Combobox
          value={subject}
          onChange={(val: string) => {
            onSubjectChange(val);
            onSubjectQueryChange(val);
          }}
        >
          <div className='relative'>
            <Combobox.Input
              id='subject'
              name='subject'
              className='w-full bg-background'
              placeholder='タイトルを入力（5文字以上）'
              value={subjectQuery}
              onChange={(e) => {
                onSubjectQueryChange(e.target.value);
                onSubjectChange(e.target.value); 
              }}
              displayValue={() => subject}
              disabled={disabled}
            />
            <Combobox.Button className='absolute inset-y-0 right-0 flex items-center pr-2'>
              <ChevronsUpDown className='h-5 w-5 text-muted-foreground' />
            </Combobox.Button>
            <Combobox.Options className='absolute z-10 mt-1 w-full bg-popover shadow-md max-h-60 overflow-auto rounded-md'>
              {isSubjectLoading && <div className='p-2'>読み込み中…</div>}
              {!isSubjectLoading && subjectOptions.length === 0 && (
                <div className='p-2 text-muted-foreground'>該当なし</div>
              )}
              {subjectOptions.map((opt) => (
                <Combobox.Option
                  key={opt}
                  value={opt}
                  className={({ active }) =>
                    `cursor-pointer select-none p-2 ${
                      active ? "bg-primary text-primary-foreground" : ""
                    }`
                  }
                >
                  {opt}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </div>
        </Combobox>
      </div>
      <div>
        <Label htmlFor='description'>説明（任意）</Label>
        <Textarea
          id='description'
          name='description'
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={disabled}
          maxLength={300}
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor='tags'>タグ（任意, 5個まで）</Label>
        <TagInput
          id='tags'
          value={tags}
          onChange={onTagsChange}
          disabled={disabled}
        />
      </div>
    </CardContent>
  </Card>
);

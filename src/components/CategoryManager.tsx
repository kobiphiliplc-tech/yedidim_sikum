'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Settings2, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type { Category, SourceType } from '@/lib/types'

interface Props {
  categories: Category[]
  onCategoriesChanged: () => void
}

interface AddForm {
  name: string
  alias: string
}

const EMPTY_FORM: AddForm = { name: '', alias: '' }

export function CategoryManager({ categories, onCategoriesChanged }: Props) {
  const supabase = createClient()
  const [forms, setForms] = useState<Record<SourceType, AddForm>>({
    emergency: { ...EMPTY_FORM },
    extra: { ...EMPTY_FORM },
    regular: { ...EMPTY_FORM },
  })
  const [adding, setAdding] = useState<SourceType | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState<string | null>(null)

  const byType = (type: SourceType) => categories.filter(c => c.type === type)

  function setField(type: SourceType, field: keyof AddForm, value: string) {
    setForms(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
  }

  async function handleMove(cat: Category, direction: 'up' | 'down') {
    const siblings = byType(cat.type)
    const idx = siblings.findIndex(c => c.id === cat.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    const other = siblings[swapIdx]
    setReordering(cat.id)
    await Promise.all([
      supabase.from('categories').update({ display_order: other.display_order ?? swapIdx + 1 }).eq('id', cat.id),
      supabase.from('categories').update({ display_order: cat.display_order ?? idx + 1 }).eq('id', other.id),
    ])
    onCategoriesChanged()
    setReordering(null)
  }

  async function handleAdd(type: SourceType) {
    const { name, alias } = forms[type]
    const trimmedName = name.trim()
    if (!trimmedName) return
    setAdding(type)
    const currentCats = byType(type)
    const nextOrder = currentCats.length > 0
      ? Math.max(...currentCats.map(c => c.display_order ?? 0)) + 1
      : 1
    const payload: { name: string; type: SourceType; display_order: number; alias?: string } = { name: trimmedName, type, display_order: nextOrder }
    if (alias.trim()) payload.alias = alias.trim()
    const { error } = await supabase.from('categories').insert(payload)
    if (error) {
      if (error.code === '23505') {
        toast.error('קטגוריה בשם זה כבר קיימת')
      } else {
        toast.error(`שגיאה: ${error.message}`)
      }
    } else {
      toast.success(`קטגוריה "${trimmedName}" נוספה`)
      setForms(prev => ({ ...prev, [type]: { ...EMPTY_FORM } }))
      onCategoriesChanged()
    }
    setAdding(null)
  }

  async function handleDelete(id: string, name: string) {
    setDeletingId(id)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      toast.error('שגיאה במחיקת קטגוריה')
    } else {
      toast.success(`קטגוריה "${name}" נמחקה`)
      onCategoriesChanged()
    }
    setDeletingId(null)
  }

  function renderSection(
    title: string,
    type: SourceType,
    accentClass: string,
    namePlaceholder: string,
    showAlias: boolean
  ) {
    const cats = byType(type)
    const form = forms[type]
    const isAdding = adding === type

    return (
      <section>
        <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${accentClass}`}>
          {title}
        </div>
        <div className="space-y-1 mb-3 min-h-[28px]">
          {cats.length === 0 && (
            <span className="text-xs text-muted-foreground">
              {type === 'regular'
                ? 'הוסף קטגוריות כדי לקבוע את סדר הופעתן בדוח — קטגוריות שלא הוגדרו יופיעו בסוף לפי סדר אלפביתי'
                : 'אין קטגוריות'}
            </span>
          )}
          {cats.map((cat, idx) => (
            <div key={cat.id} className="flex items-center gap-1 rounded-md border px-2 py-1 bg-background text-sm">
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => handleMove(cat, 'up')}
                  disabled={idx === 0 || reordering === cat.id}
                  className="text-gray-400 hover:text-foreground disabled:opacity-20 transition-colors"
                  title="הזז למעלה"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleMove(cat, 'down')}
                  disabled={idx === cats.length - 1 || reordering === cat.id}
                  className="text-gray-400 hover:text-foreground disabled:opacity-20 transition-colors"
                  title="הזז למטה"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <span className="flex-1 text-right">
                {cat.name}
                {cat.alias && (
                  <span className="text-muted-foreground text-xs"> ({cat.alias})</span>
                )}
              </span>
              <button
                onClick={() => handleDelete(cat.id, cat.name)}
                disabled={deletingId === cat.id}
                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                title={`מחק "${cat.name}"`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={form.name}
              onChange={e => setField(type, 'name', e.target.value)}
              placeholder={namePlaceholder}
              className="h-8 text-sm flex-1"
              dir="rtl"
              onKeyDown={e => e.key === 'Enter' && handleAdd(type)}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAdd(type)}
              disabled={!form.name.trim() || isAdding}
              className="gap-1 h-8 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              הוסף
            </Button>
          </div>
          {showAlias && (
            <Input
              value={form.alias}
              onChange={e => setField(type, 'alias', e.target.value)}
              placeholder='שם קצר בטקסט (אופציונלי) — למשל "מעלית" במקום "לכודים במעלית"'
              className="h-8 text-xs"
              dir="rtl"
            />
          )}
        </div>
      </section>
    )
  }

  return (
    <details className="group">
      <summary className="flex items-center gap-2 cursor-pointer select-none py-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors list-none">
        <Settings2 className="w-4 h-4" />
        <span>ניהול קטגוריות</span>
        <span className="text-xs group-open:rotate-90 transition-transform inline-block leading-none mr-auto">
          ›
        </span>
      </summary>

      <div className="mt-3 rounded-xl border bg-card p-4 space-y-5">
        {renderSection('קטגוריות חירום', 'emergency', 'text-red-600', 'שם קטגוריה...', true)}
        <div className="border-t" />
        {renderSection('קטגוריות נוספות (שאיבה, משיכה...)', 'extra', 'text-orange-600', 'שם קטגוריה...', true)}
        <div className="border-t" />
        {renderSection('קטגוריות שבועיות', 'regular', 'text-blue-600', 'שם קטגוריה שבועית...', false)}

        <p className="text-xs text-muted-foreground border-t pt-3">
          קטגוריות חירום ונוספות חייבות להתאים בדיוק לכותרות בטקסט (שם מלא או שם קצר).
        </p>
      </div>
    </details>
  )
}

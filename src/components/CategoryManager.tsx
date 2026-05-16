'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Settings2 } from 'lucide-react'
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

  const byType = (type: SourceType) => categories.filter(c => c.type === type)

  function setField(type: SourceType, field: keyof AddForm, value: string) {
    setForms(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
  }

  async function handleAdd(type: SourceType) {
    const { name, alias } = forms[type]
    const trimmedName = name.trim()
    if (!trimmedName) return
    setAdding(type)
    const payload: { name: string; type: SourceType; alias?: string } = { name: trimmedName, type }
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
        <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
          {cats.length === 0 && (
            <span className="text-xs text-muted-foreground self-center">
              {type === 'regular'
                ? 'קטגוריות שבועיות מזוהות אוטומטית מהטקסט'
                : 'אין קטגוריות'}
            </span>
          )}
          {cats.map(cat => (
            <Badge key={cat.id} variant="outline" className="gap-1.5 pl-1 text-xs">
              <span>
                {cat.name}
                {cat.alias && (
                  <span className="text-muted-foreground"> ({cat.alias})</span>
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
            </Badge>
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

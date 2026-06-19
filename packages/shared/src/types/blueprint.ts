export type FrequencyType = 'weekly' | 'biweekly'

export type DraftExpense = {
  id: string
  name: string
  amountAnnual: string
  sortOrder: number
}

export type DraftCategory = {
  id: string
  name: string
  sortOrder: number
  expenses: DraftExpense[]
}

export type BlueprintDraft = {
  name: string
  frequency: FrequencyType | null
  incomeAmount: string
  categories: DraftCategory[]
}

export const emptyDraft = (): BlueprintDraft => ({
  name: '',
  frequency: null,
  incomeAmount: '',
  categories: [],
})

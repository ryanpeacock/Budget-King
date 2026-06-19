import { FrequencyType } from '../types/blueprint'

export function paychecksPerYear(frequency: FrequencyType): number {
  return frequency === 'weekly' ? 48 : 24
}

export function toPerPaycheck(amountAnnual: number, frequency: FrequencyType): number {
  return Math.round((amountAnnual / paychecksPerYear(frequency)) * 100) / 100
}

export function toMonthly(amountAnnual: number): number {
  return Math.round((amountAnnual / 12) * 100) / 100
}

export function toAnnualFromMonthly(monthly: number): number {
  return monthly * 12
}

export function toAnnualFromPerPaycheck(perPaycheck: number, frequency: FrequencyType): number {
  return perPaycheck * paychecksPerYear(frequency)
}

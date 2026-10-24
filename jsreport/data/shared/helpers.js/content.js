// The PDF twin of the portal's lib/formatters.ts and features/reports/lib/report-cells.ts.
// Keep the two in step, or the PDF and the screen will disagree about the same number.

const DISPLAY_LOCALE = 'en-KH'
// The container runs in UTC: without the zone, an invoice paid at 03:36 UTC prints as the day before.
const DISPLAY_TIMEZONE = 'Asia/Phnom_Penh'

const STATUS_LABELS = {
  ISSUED: 'Issued',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  OVERDUE: 'Overdue'
}

// A voided payment stays on the record; it just stopped counting.
const PAYMENT_STATUS_LABELS = {
  COMPLETED: 'Completed',
  VOIDED: 'Voided',
  REFUNDED: 'Refunded'
}

const METHOD_LABELS = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  QR_CODE: 'KHQR',
  CARD: 'Card',
  WALLET: 'Wallet balance',
  OTHER: 'Other'
}

function money (value, currency) {
  if (value === null || value === undefined) return ''
  return new Intl.NumberFormat(DISPLAY_LOCALE, { style: 'currency', currency }).format(Number(value))
}

function percent (value) {
  return `${new Intl.NumberFormat(DISPLAY_LOCALE, { maximumFractionDigits: 2 }).format(Number(value))}%`
}

function formatDate (iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, { dateStyle: 'medium', timeZone: DISPLAY_TIMEZONE }).format(date)
}

function formatDateTime (iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: DISPLAY_TIMEZONE
  }).format(date)
}

// core-api has no OVERDUE status; the back office derives it the same way (invoice-display.ts).
function displayStatus (status, dueDate, balance) {
  if (status === 'PAID' || status === 'CANCELLED' || Number(balance) <= 0) return status
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: DISPLAY_TIMEZONE }).format(new Date())
  return dueDate < today ? 'OVERDUE' : status
}

function statusLabel (status) {
  return STATUS_LABELS[status] || status
}

function paymentStatusLabel (status) {
  return PAYMENT_STATUS_LABELS[status] || status
}

function methodLabel (method) {
  return METHOD_LABELS[method] || method
}

function lower (value) {
  return value ? String(value).toLowerCase() : ''
}

function inc (n) {
  return Number(n) + 1
}

function eq (a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this)
}

function gt (a, b, options) {
  return Number(a) > Number(b) ? options.fn(this) : options.inverse(this)
}

function cell (row, col, currency) {
  const value = row[col.key]
  if (value === null || value === undefined) return ''
  switch (col.format) {
    case 'MONEY': return money(value, currency)
    case 'PERCENT': return percent(value)
    case 'DATE': return formatDate(value)
    default: return String(value)
  }
}

// The first totals cell carries the label ("5 customers"); the rest are numbers or blank.
function totalCell (totals, col, index, currency) {
  if (index === 0) return totals.label == null ? '' : String(totals.label)
  return col.key in totals ? cell(totals, col, currency) : ''
}

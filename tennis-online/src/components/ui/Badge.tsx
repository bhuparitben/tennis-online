interface BadgeProps {
  label: string
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray'
}

const styles: Record<string, string> = {
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger:  'bg-danger-light text-danger',
  gray:    'bg-gray-100 text-muted',
}

const STATUS_MAP: Record<string, BadgeProps> = {
  approved:    { label: 'อนุมัติแล้ว',      variant: 'success' },
  pending:     { label: 'รอตรวจสอบ',       variant: 'warning' },
  rejected:    { label: 'ไม่อนุมัติ',        variant: 'danger' },
  need_update: { label: 'ต้องแก้ไข',        variant: 'warning' },
  verified:    { label: 'ตรวจสอบแล้ว',      variant: 'primary' },
  closed:      { label: 'ปิดให้บริการ',     variant: 'gray' },
  published:   { label: 'เผยแพร่แล้ว',      variant: 'success' },
}

export function StatusBadge({ status }: { status: string }) {
  const props = STATUS_MAP[status] ?? { label: status, variant: 'gray' as const }
  return <Badge {...props} />
}

export default function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  )
}

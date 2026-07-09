type BadgeColor = 'green' | 'blue' | 'gray' | 'red' | 'yellow' | 'orange' | 'purple'

type BadgeProps = {
  text: string
  color?: BadgeColor
  className?: string
}

const colorToClasses: Record<BadgeColor, string> = {
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
}

export default function Badge({ text, color = 'gray', className = '' }: BadgeProps) {
  const classes = colorToClasses[color]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${classes} ${className}`}>
      {text}
    </span>
  )
}

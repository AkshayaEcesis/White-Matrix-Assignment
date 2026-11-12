import {
  Building2, Bus, Construction, Droplets, GraduationCap, HandHeart, HeartPulse, Landmark, Recycle, Shield, Sprout, Wheat, Zap,
} from 'lucide-react'

const ICONS = {
  droplets: Droplets, construction: Construction, 'heart-pulse': HeartPulse, 'graduation-cap': GraduationCap,
  zap: Zap, recycle: Recycle, bus: Bus, landmark: Landmark, shield: Shield, 'hand-heart': HandHeart,
  sprout: Sprout, wheat: Wheat, 'building-2': Building2,
}

export default function DepartmentIcon({ name, className = 'size-5' }) {
  const Icon = ICONS[name] || Building2
  return <Icon className={className} aria-hidden />
}

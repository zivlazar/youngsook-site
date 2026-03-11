import Image from 'next/image'
import { homeHero } from '@/lib/data'

export default function Home() {
  return (
    <div className="w-full -mt-16">
      <Image
        src={homeHero}
        alt=""
        width={1932}
        height={1500}
        className="w-full h-auto"
        priority
        unoptimized
      />
    </div>
  )
}

import Image from 'next/image'

export default function Home() {
  return (
    <div className="w-full -mt-16">
      <Image
        src="/images/hero.jpg"
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

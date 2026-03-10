import contentData from './content.json'

export type WorkEntry = {
  slug: string
  title: string
  category: 'works' | 'archives'
  content: string[]
  images: { src: string; alt: string }[]
}

export type ContactData = {
  paragraphs: string[]
  email: string
  instagram: { handle: string; url: string }
}

export type IntroductionData = {
  paragraphs: string[]
}

export type SiteContent = {
  homeHero: string
  introduction: IntroductionData
  contact: ContactData
  works: WorkEntry[]
  archives: WorkEntry[]
}

const data = contentData as SiteContent

export const introduction: IntroductionData = data.introduction
export const contact: ContactData = data.contact
export const works: WorkEntry[] = data.works
export const archives: WorkEntry[] = data.archives
export const homeHero: string = data.homeHero

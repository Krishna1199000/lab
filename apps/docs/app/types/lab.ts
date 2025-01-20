export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

export interface Lab {
  id: string
  title: string
  difficulty: Difficulty
  duration: number
  description: string
  objectives: string[]
  audience: string
  prerequisites: string
  coveredTopics: string[]
  published: boolean
  author: {
    name: string | null
    image: string | null
  }
  createdAt: string
  updatedAt: string
}


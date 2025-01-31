import type { User } from "@repo/db/client"

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}


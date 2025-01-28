import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth.config"
import db from "@repo/db/client"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  console.log("API route hit");
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized: You must be logged in to create a lab" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only administrators can create labs" }, { status: 403 })
    }

    const formData = await req.formData()

    const requiredFields = ["title", "duration", "description", "audience", "prerequisites"]
    const missingFields = requiredFields.filter((field) => !formData.get(field))

    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    const environmentImage = formData.get("environmentImage") as File | null
    let imagePath = null

    if (environmentImage) {
      imagePath = await uploadToS3(environmentImage)
    }

    const objectives = JSON.parse((formData.get("objectives") as string) || "[]")
    const coveredTopics = JSON.parse((formData.get("coveredTopics") as string) || "[]")
    const environment = JSON.parse((formData.get("environment") as string) || "{}")
    const steps = JSON.parse((formData.get("steps") as string) || "{}")

    if (imagePath) {
      environment.images = [imagePath, ...(environment.images || [])]
    }

    const lab = await db.lab.create({
      data: {
        title: formData.get("title") as string,
        difficulty: ((formData.get("difficulty") as string) || "BEGINNER") as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
        duration: Number.parseInt(formData.get("duration") as string),
        description: formData.get("description") as string,
        objectives,
        audience: formData.get("audience") as string,
        prerequisites: formData.get("prerequisites") as string,
        environment,
        coveredTopics,
        steps,
        authorId: session.user.id,
        published: false,
      },
    })

    return NextResponse.json({ success: true, data: lab }, { status: 201 })
  } catch (error: any) {
    console.error("Server error:", error)

    if (error.code === "P2002") {
      return NextResponse.json({ error: "A lab with this title already exists" }, { status: 400 })
    }

    return NextResponse.json({ error: error.message || "Failed to create lab" }, { status: 500 })
  }
}

async function uploadToS3(file: File): Promise<string> {
  const filename = `${Date.now()}-${file.name}`
  const bucketName = process.env.AWS_S3_BUCKET_NAME!

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    ContentType: file.type,
  })

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

  const response = await fetch(signedUrl, {
    method: "PUT",
    body: await file.arrayBuffer(),
    headers: {
      "Content-Type": file.type,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to upload file to S3")
  }

  return `https://${bucketName}.s3.amazonaws.com/${filename}`
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const labs = await db.lab.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const labsWithOwnership = labs.map((lab) => ({
      ...lab,
      isOwner: session?.user?.role === "ADMIN" && session?.user?.id === lab.authorId,
    }))

    return NextResponse.json(labsWithOwnership)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch labs" }, { status: 500 })
  }
}
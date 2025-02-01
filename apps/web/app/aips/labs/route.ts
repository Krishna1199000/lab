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

async function uploadToS3(file: File, prefix: string): Promise<string> {
  try {
    const filename = `${prefix}-${Date.now()}-${file.name}`
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
  } catch (error) {
    console.error("S3 upload error:", error)
    throw new Error("Failed to upload file to S3")
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized: You must be logged in to create a lab" }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden: Only administrators can create labs" }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()

    // Validate required fields
    const requiredFields = [
      "title",
      "duration",
      "description",
      "audience",
      "prerequisites",
    ]
    
    const missingFields = requiredFields.filter((field) => {
      const value = formData.get(field)
      return value === null || value === undefined || value === ""
    })

    if (missingFields.length > 0) {
      return new NextResponse(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(", ")}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Handle image uploads
    const environmentImageBefore = formData.get("environmentImageBefore") as File | null
    const environmentImageAfter = formData.get("environmentImageAfter") as File | null
    let beforeImagePath = null
    let afterImagePath = null

    try {
      if (environmentImageBefore) {
        beforeImagePath = await uploadToS3(environmentImageBefore, 'before')
      }

      if (environmentImageAfter) {
        afterImagePath = await uploadToS3(environmentImageAfter, 'after')
      }
    } catch (error) {
      return new NextResponse(
        JSON.stringify({ error: "Failed to upload images" }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse JSON fields with error handling
    let objectives = []
    let coveredTopics = []
    let steps = {}

    try {
      const objectivesStr = formData.get("objectives")
      const coveredTopicsStr = formData.get("coveredTopics")
      const stepsStr = formData.get("steps")

      objectives = objectivesStr ? JSON.parse(objectivesStr as string) : []
      coveredTopics = coveredTopicsStr ? JSON.parse(coveredTopicsStr as string) : []
      steps = stepsStr ? JSON.parse(stepsStr as string) : {}
    } catch (error) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid JSON data provided in form fields" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const duration = parseInt(formData.get("duration") as string, 10)
    if (isNaN(duration)) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid duration value" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create lab with validated data
    const lab = await db.lab.create({
      data: {
        title: formData.get("title") as string,
        difficulty: (formData.get("difficulty") as string || "BEGINNER") as
          | "BEGINNER"
          | "INTERMEDIATE"
          | "ADVANCED",
        duration,
        description: formData.get("description") as string,
        objectives,
        audience: formData.get("audience") as string,
        prerequisites: formData.get("prerequisites") as string,
        coveredTopics,
        steps: steps as Json,
        authorId: session.user.id,
        published: false,
        environmentImageBefore: beforeImagePath,
        environmentImageAfter: afterImagePath,
      },
    })

    return new NextResponse(
      JSON.stringify({ success: true, data: lab }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === "P2002") {
      return new NextResponse(
        JSON.stringify({ error: "A lab with this title already exists" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Handle all other errors
    return new NextResponse(
      JSON.stringify({ error: error.message || "Failed to create lab" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
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

    return new NextResponse(
      JSON.stringify(labsWithOwnership),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch labs" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

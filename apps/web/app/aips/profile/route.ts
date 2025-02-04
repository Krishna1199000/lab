import { type NextRequest } from "next/server"
import db from "@repo/db/client"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth.config"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

async function uploadToS3(file: File): Promise<string> {
  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size exceeds the limit of 5MB")
    }

    const filename = `profile-${Date.now()}-${file.name}`
    const bucketName = process.env.AWS_S3_BUCKET_NAME!

    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET_NAME is not configured")
    }

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
    console.error("Error in uploadToS3:", error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check if profile already exists
    const existingProfile = await db.profile.findUnique({
      where: { userId: session.user.id },
    })

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "Profile already exists. Use PUT to update." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const formData = await req.formData()
    const profileData: Record<string, any> = {
      userId: session.user.id,
    }

    // Handle text fields
    const fields = ["bio", "role", "company", "location", "github", "twitter", "linkedin"]
    fields.forEach((field) => {
      const value = formData.get(field)
      if (value !== null && value !== "") {
        profileData[field] = value.toString()
      }
    })

    // Handle profile image
    const image = formData.get("image") as File | null
    if (image) {
      try {
        const imageUrl = await uploadToS3(image)
        profileData.image = imageUrl

        await db.user.update({
          where: { id: session.user.id },
          data: { image: imageUrl },
        })
      } catch (uploadError) {
        return new Response(
          JSON.stringify({
            error: "Failed to upload image",
            details: uploadError instanceof Error ? uploadError.message : "Unknown error",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        )
      }
    }

    let profile
    try {
      profile = await db.profile.create({
        data: {
          ...profileData,
          user: {
            connect: { id: session.user.id },
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })
    } catch (dbError) {
      return new Response(
        JSON.stringify({
          error: "Failed to create profile in database",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      )
    }

    return new Response(JSON.stringify(profile), { status: 201, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to create profile",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(profile), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch profile",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
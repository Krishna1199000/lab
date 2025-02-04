import { type NextRequest } from "next/server"
import { NextResponse } from "next/server"
import db from "@repo/db/client"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../api/auth.config"
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
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

async function deleteFromS3(url: string) {
  if (!url) return
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME!
    const key = url.split(`https://${bucketName}.s3.amazonaws.com/`)[1]

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    await s3Client.send(command)
  } catch (error) {
    console.error("Error in deleteFromS3:", error)
    throw error
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns this profile or is admin
    const profile = await db.profile.findUnique({
      where: { userId: params.id },
    })

    if (!profile || (profile.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const updateData: Record<string, any> = {}

    // Handle text fields
    const fields = ["bio", "role", "company", "location", "github", "twitter", "linkedin"]
    fields.forEach((field) => {
      const value = formData.get(field)
      if (value !== null && value !== "") {
        updateData[field] = value.toString()
      }
    })

    // Handle profile image
    const image = formData.get("image") as File | null
    if (image) {
      // Delete old image from S3 if it exists
      if (profile.image) {
        await deleteFromS3(profile.image)
      }

      // Upload new image
      const imageUrl = await uploadToS3(image)
      updateData.image = imageUrl

      // Update user's image field
      await db.user.update({
        where: { id: params.id },
        data: { image: imageUrl },
      })
    }

    // Update profile
    const updatedProfile = await db.profile.update({
      where: { userId: params.id },
      data: updateData,
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

    return NextResponse.json(updatedProfile)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: params.id },
      select: {
        userId: true,
        image: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if user owns this profile or is admin
    if (profile.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete profile image from S3 if it exists
    if (profile.image) {
      await deleteFromS3(profile.image)
    }

    // Delete profile
    await db.profile.delete({
      where: { userId: params.id },
    })

    // Update user's image to null
    await db.user.update({
      where: { id: params.id },
      data: { image: null },
    })

    return NextResponse.json({ message: "Profile deleted successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 })
  }
}
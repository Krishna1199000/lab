import { type NextRequest, NextResponse } from "next/server"
import db from "@repo/db/client"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth.config"
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
  const filename = `profile-${Date.now()}-${file.name}`
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

async function deleteFromS3(url: string) {
  if (!url) return;
  const bucketName = process.env.AWS_S3_BUCKET_NAME!
  const key = url.split(`https://${bucketName}.s3.amazonaws.com/`)[1]

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  await s3Client.send(command)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only administrators can create profiles" }, { status: 403 })
    }

    // Check if profile already exists
    const existingProfile = await db.profile.findUnique({
      where: { userId: session.user.id },
    })

    if (existingProfile) {
      return NextResponse.json({ error: "Profile already exists. Use PUT to update." }, { status: 400 })
    }

    const formData = await req.formData()
    const profileData: any = {}

    // Handle text fields
    const fields = ["bio", "role", "company", "location", "github", "twitter", "linkedin"]
    fields.forEach((field) => {
      const value = formData.get(field)
      if (value !== null) {
        profileData[field] = value
      }
    })

    // Handle profile image
    const image = formData.get("image") as File | null
    if (image) {
      const imageUrl = await uploadToS3(image)
      // Update user's image field
      await db.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
      })
    }

    // Create profile
    const profile = await db.profile.create({
      data: {
        ...profileData,
        userId: session.user.id,
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

    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error("Create error:", error)
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const updateData: any = {}

    // Handle text fields
    const fields = ["bio", "role", "company", "location", "github", "twitter", "linkedin"]
    fields.forEach((field) => {
      const value = formData.get(field)
      if (value !== null) {
        updateData[field] = value
      }
    })

    // Handle profile image
    const image = formData.get("image") as File | null
    if (image) {
      // Get current profile to delete old image
      const currentProfile = await db.user.findUnique({
        where: { id: session.user.id },
        select: { image: true },
      })

      // Delete old image from S3 if it exists
      if (currentProfile?.image) {
        await deleteFromS3(currentProfile.image)
      }

      // Upload new image
      const imageUrl = await uploadToS3(image)
      updateData.image = imageUrl
    }

    // Update or create profile
    const profile = await db.profile.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        ...updateData,
        userId: session.user.id,
      },
    })

    // If image was updated, also update the user's image field
    if (updateData.image) {
      await db.user.update({
        where: { id: session.user.id },
        data: { image: updateData.image },
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: { image: true },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Delete profile image from S3 if it exists
    if (profile.user.image) {
      await deleteFromS3(profile.user.image)
    }

    // Delete profile
    await db.profile.delete({
      where: { userId: session.user.id },
    })

    // Update user's image to null
    await db.user.update({
      where: { id: session.user.id },
      data: { image: null },
    })

    return NextResponse.json({ message: "Profile deleted successfully" })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 })
  }
}
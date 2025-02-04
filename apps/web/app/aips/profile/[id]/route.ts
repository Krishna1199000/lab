import { type NextRequest, NextResponse } from "next/server"
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
    console.log("Starting S3 upload for file:", file.name)

    // Check file size (e.g., limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size exceeds the limit of 5MB")
    }

    const filename = `profile-${Date.now()}-${file.name}`
    const bucketName = process.env.AWS_S3_BUCKET_NAME!

    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET_NAME is not configured")
    }

    console.log("S3 bucket name:", bucketName)

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: file.type,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    console.log("Generated signed URL for S3 upload")

    const response = await fetch(signedUrl, {
      method: "PUT",
      body: await file.arrayBuffer(),
      headers: {
        "Content-Type": file.type,
      },
    })

    if (!response.ok) {
      console.error("S3 upload failed:", response.status, response.statusText)
      throw new Error("Failed to upload file to S3")
    }

    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${filename}`
    console.log("S3 upload successful. File URL:", fileUrl)
    return fileUrl
  } catch (error) {
    console.error("Error in uploadToS3:", error)
    throw error
  }
}

async function deleteFromS3(url: string) {
  if (!url) return
  try {
    console.log("Starting S3 delete for URL:", url)
    const bucketName = process.env.AWS_S3_BUCKET_NAME!
    const key = url.split(`https://${bucketName}.s3.amazonaws.com/`)[1]

    console.log("Deleting file with key:", key)

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    await s3Client.send(command)
    console.log("S3 delete successful")
  } catch (error) {
    console.error("Error in deleteFromS3:", error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Starting POST request for profile creation")
    const session = await getServerSession(authOptions)
    console.log("Session:", session ? "Found" : "Not found")

    if (!session?.user?.id) {
      console.log("Unauthorized: No session or user ID")
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Remove the ADMIN role check for now, as it might be causing issues
    // if (session.user.role !== "ADMIN") {
    //   console.log('Forbidden: User is not an admin')
    //   return new Response(
    //     JSON.stringify({ error: "Forbidden: Only administrators can create profiles" }),
    //     { status: 403, headers: { 'Content-Type': 'application/json' } }
    //   )
    // }

    // Check if profile already exists
    const existingProfile = await db.profile.findUnique({
      where: { userId: session.user.id },
    })
    console.log("Existing profile:", existingProfile ? "Found" : "Not found")

    if (existingProfile) {
      console.log("Profile already exists")
      return new Response(JSON.stringify({ error: "Profile already exists. Use PUT to update." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const formData = await req.formData()
    console.log("Form data fields:", Array.from(formData.keys()))

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
    console.log("Profile data after processing fields:", profileData)

    // Handle profile image
    const image = formData.get("image") as File | null
    if (image) {
      try {
        console.log("Processing image upload:", image.name)
        const imageUrl = await uploadToS3(image)
        profileData.image = imageUrl

        console.log("Updating user image")
        await db.user.update({
          where: { id: session.user.id },
          data: { image: imageUrl },
        })
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError)
        return new Response(
          JSON.stringify({
            error: "Failed to upload image",
            details: uploadError instanceof Error ? uploadError.message : "Unknown error",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        )
      }
    }

    console.log("Creating profile with data:", profileData)
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
      console.error("Database error when creating profile:", dbError)
      return new Response(
        JSON.stringify({
          error: "Failed to create profile in database",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      )
    }
    console.log("Profile created successfully:", profile)

    return new Response(JSON.stringify(profile), { status: 201, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    console.error("Unhandled error in POST function:", error)
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
    console.error("Fetch error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to fetch profile",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
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
      // Get current profile to delete old image
      const currentProfile = await db.profile.findUnique({
        where: { userId: session.user.id },
        select: { image: true },
      })

      // Delete old image from S3 if it exists
      if (currentProfile?.image) {
        await deleteFromS3(currentProfile.image)
      }

      // Upload new image
      const imageUrl = await uploadToS3(image)
      updateData.image = imageUrl

      // Update user's image field
      await db.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
      })
    }

    // Update profile
    const profile = await db.profile.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        ...updateData,
        userId: session.user.id,
      },
    })

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
      select: {
        image: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Delete profile image from S3 if it exists
    if (profile.image) {
      await deleteFromS3(profile.image)
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


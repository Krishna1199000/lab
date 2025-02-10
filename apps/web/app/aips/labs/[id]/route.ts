import { type NextRequest, NextResponse } from "next/server"
import db from "@repo/db/client"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../api/auth.config"
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

type Context = {
  params: {
    id: string;
  };
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

async function generateSignedUrl(key: string) {
  if (!key) return null
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  })
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

export async function PUT(
  request: NextRequest,
  context: Context
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only administrators can edit labs" }, { status: 403 })
    }

    const existingLab = await db.lab.findUnique({
      where: { id: context.params.id },
    })

    if (!existingLab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 })
    }

    if (existingLab.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own labs" }, { status: 403 })
    }

    const formData = await request.formData()
    const updateData: Record<string, unknown> = {};

    const fields = [
      "title",
      "description",
      "difficulty",
      "duration",
      "objectives",
      "audience",
      "prerequisites",
      "environment",
      "coveredTopics",
      "steps",
      "published",
    ]

    fields.forEach((field) => {
      const value = formData.get(field)
      if (value !== null) {
        if (field === "duration") {
          updateData[field] = Number.parseInt(value as string)
        } else if (["objectives", "coveredTopics", "environment", "steps"].includes(field)) {
          updateData[field] = JSON.parse(value as string)
        } else if (field === "published") {
          updateData[field] = value === "true"
        } else {
          updateData[field] = value
        }
      }
    })

    const environmentImageBefore = formData.get("environmentImageBefore") as File
    const environmentImageAfter = formData.get("environmentImageAfter") as File

    if (environmentImageBefore) {
      const imageUrl = await uploadToS3(environmentImageBefore)
      updateData.environmentImageBefore = imageUrl
    }

    if (environmentImageAfter) {
      const imageUrl = await uploadToS3(environmentImageAfter)
      updateData.environmentImageAfter = imageUrl
    }

    const lab = await db.lab.update({
      where: { id: context.params.id },
      data: updateData,
    })

    return NextResponse.json(lab)
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Failed to update lab" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only administrators can delete labs" }, { status: 403 })
    }

    const existingLab = await db.lab.findUnique({
      where: { id: context.params.id },
    })

    if (!existingLab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 })
    }

    if (existingLab.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own labs" }, { status: 403 })
    }

    if (existingLab.environmentImageBefore) {
      await deleteFromS3(existingLab.environmentImageBefore)
    }

    if (existingLab.environmentImageAfter) {
      await deleteFromS3(existingLab.environmentImageAfter)
    }

    await db.lab.delete({
      where: { id: context.params.id },
    })

    return NextResponse.json({ message: "Lab deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Failed to delete lab" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const lab = await db.lab.findUnique({
      where: { id: context.params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 })
    }

    const environmentImageBefore = lab.environmentImageBefore
      ? await generateSignedUrl(lab.environmentImageBefore.split(".com/")[1] || "")
      : null;
    const environmentImageAfter = lab.environmentImageAfter
      ? await generateSignedUrl(lab.environmentImageAfter.split(".com/")[1] || "")
      : null;

    const labWithOwnership = {
      ...lab,
      environmentImageBefore,
      environmentImageAfter,
      isOwner: session.user.role === "ADMIN" && session.user.id === lab.authorId,
    }

    return NextResponse.json(labWithOwnership)
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch lab" }, { status: 500 })
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

async function deleteFromS3(url: string) {
  const bucketName = process.env.AWS_S3_BUCKET_NAME!
  const key = url.split(`https://${bucketName}.s3.amazonaws.com/`)[1]

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  await s3Client.send(command)
}
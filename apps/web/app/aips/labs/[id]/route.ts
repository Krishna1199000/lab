import { NextRequest, NextResponse } from "next/server";
import db from "@repo/db/client";
import { writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../api/auth.config";



export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can edit labs" },
        { status: 403 }
      );
    }

    const existingLab = await db.lab.findUnique({
      where: { id: params.id }
    });

    if (!existingLab) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      );
    }

    if (existingLab.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only edit your own labs" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const updateData: any = {};

    const fields = [
      "title", "description", "difficulty", "duration",
      "objectives", "audience", "prerequisites",
      "environment", "coveredTopics", "steps", "published"
    ];

    fields.forEach(field => {
      const value = formData.get(field);
      if (value !== null) {
        if (field === "duration") {
          updateData[field] = parseInt(value as string);
        } else if (["objectives", "coveredTopics", "environment", "steps"].includes(field)) {
          updateData[field] = JSON.parse(value as string);
        } else if (field === "published") {
          updateData[field] = value === "true";
        } else {
          updateData[field] = value;
        }
      }
    });

    const environmentImage = formData.get("environmentImage") as File;
    if (environmentImage) {
      const bytes = await environmentImage.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filename = `${Date.now()}-${environmentImage.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer);

      const imageUrl = `/uploads/${filename}`;
      const existingEnvironment = updateData.environment || { images: [] };
      existingEnvironment.images = [imageUrl, ...existingEnvironment.images];
      updateData.environment = existingEnvironment;
    }

    const lab = await db.lab.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(lab);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: "Failed to update lab" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can delete labs" },
        { status: 403 }
      );
    }

    const existingLab = await db.lab.findUnique({
      where: { id: params.id }
    });

    if (!existingLab) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      );
    }

    if (existingLab.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own labs" },
        { status: 403 }
      );
    }
    
    await db.lab.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { message: "Lab deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete lab" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const lab = await db.lab.findUnique({
      where: { id: params.id },
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

    // Add isOwner flag to the lab
    const labWithOwnership = {
      ...lab,
      isOwner: session.user.role === "ADMIN" && session.user.id === lab.authorId,
    }

    return NextResponse.json(labWithOwnership)
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch lab" }, { status: 500 })
  }
}

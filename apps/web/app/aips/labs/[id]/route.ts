import { NextRequest, NextResponse } from "next/server";
import db from "@repo/db/client";
import { writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../api/auth.config";

export async function GET() {
  try {
    const labs = await db.lab.findMany({
      where: {
        published: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(labs);
  } catch (error) {
    console.error('Error fetching labs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch labs' },
      { status: 500 }
    );
  }
}
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

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can edit labs" },
        { status: 403 }
      );
    }

    // Check if the lab exists and belongs to the current admin
    const existingLab = await db.lab.findUnique({
      where: { id: params.id }
    });

    if (!existingLab) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      );
    }

    // Check if the current admin is the author
    if (existingLab.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only edit your own labs" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const updateData: any = {};

    // Extract all possible fields from formData
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

    // Handle file upload if present
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

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can delete labs" },
        { status: 403 }
      );
    }

    // Check if the lab exists and belongs to the current admin
    const existingLab = await db.lab.findUnique({
      where: { id: params.id }
    });

    if (!existingLab) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      );
    }

    // Check if the current admin is the author
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


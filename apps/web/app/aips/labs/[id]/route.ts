import { NextRequest, NextResponse } from "next/server";
import db from "@repo/db/client";
import { writeFile } from "fs/promises";
import path from "path";

// GET /api/labs/[id] - Get a specific lab
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    
    const lab = await db.lab.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!lab) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(lab);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch lab" },
      { status: 500 }
    );
  }
}

// PUT /api/labs/[id] - Update a lab
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
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

      // Create unique filename
      const filename = `${Date.now()}-${environmentImage.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const filepath = path.join(uploadDir, filename);

      // Save file
      await writeFile(filepath, buffer);

      // Update environment with new image URL
      const imageUrl = `/uploads/${filename}`;
      const existingEnvironment = updateData.environment || { images: [] };
      existingEnvironment.images = [imageUrl, ...existingEnvironment.images];
      updateData.environment = existingEnvironment;
    }

    const lab = await db.lab.update({
      where: { id },
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

// DELETE /api/labs/[id] - Delete a lab
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    
    await db.lab.delete({
      where: { id },
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
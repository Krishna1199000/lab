import { NextRequest, NextResponse } from "next/server";
import db  from "@repo/db/client";

// GET /api/labs/[id] - Get a specific lab
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lab = await db.lab.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
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

    const lab = await db.lab.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(lab);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update lab" },
      { status: 500 }
    );
  }
}

// DELETE /api/labs/[id] - Delete a lab
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
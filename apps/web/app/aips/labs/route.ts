import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import db from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth.config";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized: You must be logged in to create a lab" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can create labs" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    
    // Validate required fields first
    const requiredFields = ["title", "duration", "description", "audience", "prerequisites"];
    const missingFields = requiredFields.filter(field => !formData.get(field));
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Handle file upload if present
    const environmentImage = formData.get('environmentImage') as File | null;
    let imagePath = null;
    
    if (environmentImage) {
      imagePath = await saveFile(environmentImage);
    }

    // Safely parse all JSON fields with default values
    const objectives = JSON.parse(formData.get("objectives") as string || "[]");
    const coveredTopics = JSON.parse(formData.get("coveredTopics") as string || "[]");
    const environment = JSON.parse(formData.get("environment") as string || "{}");
    const steps = JSON.parse(formData.get("steps") as string || "{}");

    // Add image path to environment if uploaded
    if (imagePath) {
      environment.images = [imagePath, ...(environment.images || [])];
    }

    // Create the lab with validated data and current user as author
    const lab = await db.lab.create({
      data: {
        title: formData.get("title") as string,
        difficulty: (formData.get("difficulty") as string || "BEGINNER") as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
        duration: parseInt(formData.get("duration") as string),
        description: formData.get("description") as string,
        objectives,
        audience: formData.get("audience") as string,
        prerequisites: formData.get("prerequisites") as string,
        environment,
        coveredTopics,
        steps,
        authorId: session.user.id,
        published: false
      },
    });

    return NextResponse.json({ success: true, data: lab }, { status: 201 });
  } catch (error: any) {
    console.error('Server error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A lab with this title already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create lab" },
      { status: 500 }
    );
  }
}

// Helper function to save files
async function saveFile(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const filename = `${Date.now()}-${file.name}`;
  const uploadDir = join(process.cwd(), "public/uploads");
  
  try {
    await mkdir(uploadDir, { recursive: true });
    const path = join(uploadDir, filename);
    await writeFile(path, buffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error("Error saving file:", error);
    throw new Error("Failed to save file");
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
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
        createdAt: 'desc' // Show newest labs first
      },
    });

    // Add isOwner flag to each lab - only true if user is admin AND is the author
    const labsWithOwnership = labs.map(lab => ({
      ...lab,
      isOwner: session?.user?.role === "ADMIN" && session?.user?.id === lab.authorId
    }));

    return NextResponse.json(labsWithOwnership);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch labs" },
      { status: 500 }
    );
  }
}


const express = require('express');
const router = express.Router();
const db = require('@repo/db/client')
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');


// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to check authentication
const authenticateUser = async (req, res, next) => {
  // Replace this with your actual authentication logic
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Middleware to check admin role
const isAdmin = async (req, res, next) => {
  if (req.session.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden: Only administrators can perform this action" });
  }
  next();
};

// GET /api/labs - Get all published labs
router.get('/', async (req, res) => {
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

    res.json(labs);
  } catch (error) {
    console.error('Error fetching labs:', error);
    res.status(500).json({ error: 'Failed to fetch labs' });
  }
});

// PUT /api/labs/:id - Update a lab
router.put('/:id', authenticateUser, isAdmin, upload.single('environmentImage'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the lab exists and belongs to the current admin
    const existingLab = await db.lab.findUnique({
      where: { id }
    });

    if (!existingLab) {
      return res.status(404).json({ error: "Lab not found" });
    }

    // Check if the current admin is the author
    if (existingLab.authorId !== req.session.user.id) {
      return res.status(403).json({ error: "Forbidden: You can only edit your own labs" });
    }

    const updateData = {};
    const fields = [
      "title", "description", "difficulty", "duration",
      "objectives", "audience", "prerequisites",
      "environment", "coveredTopics", "steps", "published"
    ];

    // Process form data
    fields.forEach(field => {
      if (field in req.body) {
        if (field === "duration") {
          updateData[field] = parseInt(req.body[field]);
        } else if (["objectives", "coveredTopics", "environment", "steps"].includes(field)) {
          updateData[field] = JSON.parse(req.body[field]);
        } else if (field === "published") {
          updateData[field] = req.body[field] === "true";
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Handle file upload if present
    if (req.file) {
      const filename = `${Date.now()}-${req.file.originalname}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const filepath = path.join(uploadDir, filename);

      await fs.writeFile(filepath, req.file.buffer);

      const imageUrl = `/uploads/${filename}`;
      const existingEnvironment = updateData.environment || { images: [] };
      existingEnvironment.images = [imageUrl, ...existingEnvironment.images];
      updateData.environment = existingEnvironment;
    }

    const lab = await db.lab.update({
      where: { id },
      data: updateData,
    });

    res.json(lab);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: "Failed to update lab" });
  }
});

// DELETE /api/labs/:id - Delete a lab
router.delete('/:id', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the lab exists and belongs to the current admin
    const existingLab = await db.lab.findUnique({
      where: { id }
    });

    if (!existingLab) {
      return res.status(404).json({ error: "Lab not found" });
    }

    // Check if the current admin is the author
    if (existingLab.authorId !== req.session.user.id) {
      return res.status(403).json({ error: "Forbidden: You can only delete your own labs" });
    }
    
    await db.lab.delete({
      where: { id },
    });

    res.json({ message: "Lab deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete lab" });
  }
});

module.exports = router;
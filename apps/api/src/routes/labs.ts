import { Router } from 'express';
import multer from 'multer';
import PrismaClient  from '@repo/db/client';
import { isAdmin } from '../middleware/auth.js';
import { uploadToS3, deleteFromS3, generateSignedUrl } from '../utils/s3.js';

const router = Router();
const prisma = PrismaClient
const upload = multer({ storage: multer.memoryStorage() });

// Get all labs
router.get('/', async (req, res) => {
  try {
    const labs = await prisma.lab.findMany({
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
        createdAt: 'desc',
      },
    });

    const labsWithOwnership = labs.map((lab) => ({
      ...lab,
      isOwner: req.session.role === 'ADMIN' && req.session.userId === lab.authorId,
    }));

    res.json(labsWithOwnership);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch labs' });
  }
});

// Get single lab
router.get('/:id', async (req, res) => {
  try {
    const lab = await prisma.lab.findUnique({
      where: { id: req.params.id },
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
    });

    if (!lab) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    let environment = lab.environment as any;
    if (environment?.images?.length > 0) {
      const signedUrls = await Promise.all(
        environment.images.map((image: string) => 
          generateSignedUrl(image.split('.com/')[1])
        )
      );
      environment = {
        ...environment,
        images: signedUrls.filter(Boolean),
      };
    }

    const labWithOwnership = {
      ...lab,
      environment,
      isOwner: req.session.role === 'ADMIN' && req.session.userId === lab.authorId,
    };

    res.json(labWithOwnership);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lab' });
  }
});

// Create lab
router.post('/', 
  isAdmin,
  upload.fields([
    { name: 'environmentImageBefore', maxCount: 1 },
    { name: 'environmentImageAfter', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      const requiredFields = ['title', 'duration', 'description', 'audience', 'prerequisites'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }

      let beforeImagePath = null;
      let afterImagePath = null;

      if (files.environmentImageBefore) {
        beforeImagePath = await uploadToS3(files.environmentImageBefore[0], 'before');
      }

      if (files.environmentImageAfter) {
        afterImagePath = await uploadToS3(files.environmentImageAfter[0], 'after');
      }

      const environment = JSON.parse(req.body.environment || '{}');
      if (beforeImagePath) {
        environment.images = [beforeImagePath, ...(environment.images || [])];
      }

      const lab = await prisma.lab.create({
        data: {
          title: req.body.title,
          difficulty: req.body.difficulty || 'BEGINNER',
          duration: parseInt(req.body.duration),
          description: req.body.description,
          objectives: JSON.parse(req.body.objectives || '[]'),
          audience: req.body.audience,
          prerequisites: req.body.prerequisites,
          environment,
          coveredTopics: JSON.parse(req.body.coveredTopics || '[]'),
          steps: JSON.parse(req.body.steps || '{}'),
          authorId: req.session.userId!,
          published: false,
          environmentImageBefore: beforeImagePath,
          environmentImageAfter: afterImagePath,
        },
      });

      res.status(201).json({ success: true, data: lab });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'A lab with this title already exists' });
      }
      res.status(500).json({ error: error.message || 'Failed to create lab' });
    }
});

// Update lab
router.put('/:id',
  isAdmin,
  upload.single('environmentImage'),
  async (req, res) => {
    try {
      const existingLab = await prisma.lab.findUnique({
        where: { id: req.params.id },
      });

      if (!existingLab) {
        return res.status(404).json({ error: 'Lab not found' });
      }

      if (existingLab.authorId !== req.session.userId) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own labs' });
      }

      const updateData: any = {};
      const fields = [
        'title', 'description', 'difficulty', 'duration',
        'objectives', 'audience', 'prerequisites', 'environment',
        'coveredTopics', 'steps', 'published'
      ];

      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'duration') {
            updateData[field] = parseInt(req.body[field]);
          } else if (['objectives', 'coveredTopics', 'environment', 'steps'].includes(field)) {
            updateData[field] = JSON.parse(req.body[field]);
          } else if (field === 'published') {
            updateData[field] = req.body[field] === 'true';
          } else {
            updateData[field] = req.body[field];
          }
        }
      });

      if (req.file) {
        const imageUrl = await uploadToS3(req.file, 'lab');
        const existingEnvironment = updateData.environment || { images: [] };

        if (existingEnvironment.images && existingEnvironment.images.length > 0) {
          await deleteFromS3(existingEnvironment.images[0]);
        }

        existingEnvironment.images = [imageUrl, ...existingEnvironment.images.slice(1)];
        updateData.environment = existingEnvironment;
      }

      const lab = await prisma.lab.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json(lab);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update lab' });
    }
});

// Delete lab
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const existingLab = await prisma.lab.findUnique({
      where: { id: req.params.id },
    });

    if (!existingLab) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    if (existingLab.authorId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own labs' });
    }

    if (existingLab.environment && (existingLab.environment as any).images?.length > 0) {
      await deleteFromS3((existingLab.environment as any).images[0]);
    }

    await prisma.lab.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Lab deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lab' });
  }
});

export const labRoutes = router;
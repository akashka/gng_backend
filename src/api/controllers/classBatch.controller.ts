export {};
import { NextFunction, Request, Response } from 'express';
const mongoose = require('mongoose');
const ClassBatch = require('../models/classBatch.model');
const Teacher = require('../models/teacher.model');

const updateTeacherWeekDays = async (teacherId: any) => {
  if (!teacherId) return;
  const teacher = await Teacher.findById(teacherId);
  const classBatches = await ClassBatch.find({ teacherId }).lean().exec();
  if (teacher && classBatches && classBatches.length > 0) {
    let daysOfWeek: any = [];
    let timeOfDay: any = [];
    for (let c = 0; c < classBatches.length; c++) {
      daysOfWeek = daysOfWeek.concat(classBatches[c].days);
      timeOfDay = timeOfDay.concat(classBatches[c].time);
    }
    teacher.daysOfWeek = daysOfWeek;
    teacher.timeOfDay = timeOfDay;
    const savedTeacher = await teacher.save();
  }
};

// Get all batches with optional filtering
exports.getClassBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teacherId, subjects, boards, classes, isActive } = req.query;

    // Build filter based on query parameters
    const filter = {
      teacherId,
      subjects,
      boards,
      classes
    };

    console.log('req.query', JSON.stringify(req.query));
    if (teacherId) {
      filter.teacherId = teacherId;
    }

    if (subjects) {
      filter.subjects = { $in: Array.isArray(subjects) ? subjects : [subjects] };
    }

    if (boards) {
      filter.boards = { $in: Array.isArray(boards) ? boards : [boards] };
    }

    if (classes) {
      filter.classes = { $in: Array.isArray(classes) ? classes : [classes] };
    }

    console.log('filter', JSON.stringify(filter));
    const classBatches = await ClassBatch.find(filter).sort({ batchStartDate: 1 }).exec();

    console.log('classBatches', JSON.stringify(classBatches));

    res.status(200).json(classBatches);
  } catch (error) {
    console.error('Error fetching class batches:', error);
    res.status(500).json({ message: 'Failed to fetch class batches', error: error.message });
  }
};

// Get single batch by ID
exports.getClassBatchById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const classBatch = await ClassBatch.findById(id);

    if (!classBatch) {
      return res.status(404).json({ message: 'Class batch not found' });
    }

    res.status(200).json(classBatch);
  } catch (error) {
    console.error('Error fetching class batch:', error);
    res.status(500).json({ message: 'Failed to fetch class batch', error: error.message });
  }
};

// Create new batch
exports.createClassBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batchData = req.body;

    // Ensure days and time are in the correct format
    if (batchData.days && Array.isArray(batchData.days)) {
      batchData.days = batchData.days.map((day: any) => {
        return typeof day === 'object' ? day.day_name : day;
      });
    }

    if (batchData.time && Array.isArray(batchData.time)) {
      batchData.time = batchData.time.map((time: any) => {
        return typeof time === 'object' ? time.start_time : time;
      });
    }

    // Convert dates if they're provided as strings
    if (batchData.batchStartDate && typeof batchData.batchStartDate === 'string') {
      batchData.batchStartDate = new Date(batchData.batchStartDate);
    }

    if (batchData.lastEnrolDate && typeof batchData.lastEnrolDate === 'string') {
      batchData.lastEnrolDate = new Date(batchData.lastEnrolDate);
    }

    const newClassBatch = new ClassBatch(batchData);
    await newClassBatch.save();

    await updateTeacherWeekDays(batchData.teacherId);

    res.status(201).json(newClassBatch);
  } catch (error) {
    console.error('Error creating class batch:', error);
    res.status(500).json({ message: 'Failed to create class batch', error: error.message });
  }
};

// Update batch
exports.updateClassBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Ensure days and time are in the correct format
    if (updateData.days && Array.isArray(updateData.days)) {
      updateData.days = updateData.days.map((day: any) => {
        return typeof day === 'object' ? day.day_name : day;
      });
    }

    if (updateData.time && Array.isArray(updateData.time)) {
      updateData.time = updateData.time.map((time: any) => {
        return typeof time === 'object' ? time.start_time : time;
      });
    }

    // Convert dates if they're provided as strings
    if (updateData.batchStartDate && typeof updateData.batchStartDate === 'string') {
      updateData.batchStartDate = new Date(updateData.batchStartDate);
    }

    if (updateData.lastEnrolDate && typeof updateData.lastEnrolDate === 'string') {
      updateData.lastEnrolDate = new Date(updateData.lastEnrolDate);
    }

    const updatedClassBatch = await ClassBatch.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!updatedClassBatch) {
      return res.status(404).json({ message: 'Class batch not found' });
    }

    await updateTeacherWeekDays(updateData.teacherId);

    res.status(200).json(updatedClassBatch);
  } catch (error) {
    console.error('Error updating class batch:', error);
    res.status(500).json({ message: 'Failed to update class batch', error: error.message });
  }
};

// Delete batch
exports.deleteClassBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deletedClassBatch = await ClassBatch.findByIdAndDelete(id);

    if (!deletedClassBatch) {
      return res.status(404).json({ message: 'Class batch not found' });
    }

    await updateTeacherWeekDays(deletedClassBatch.teacherId);

    res.status(200).json({ message: 'Class batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting class batch:', error);
    res.status(500).json({ message: 'Failed to delete class batch', error: error.message });
  }
};

// Get batches by teacher with student enrollment info
exports.getTeacherBatchesWithEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teacherId } = req.params;

    const classBatches = await ClassBatch.find({ teacherId }).lean().exec();

    res.status(200).json(classBatches);
  } catch (error) {
    console.error('Error fetching teacher batches with enrollment:', error);
    res.status(500).json({
      message: 'Failed to fetch teacher batches with enrollment',
      error: error.message
    });
  }
};

const crypto = require('crypto');
const mongoose = require('mongoose');

const QUESTION_TYPES = [
  'short-answer',
  'long-answer',
  'multiple-choice',
  'checkboxes',
  'dropdown',
  'rating',
  'yes-no',
];

const CHOICE_TYPES = ['multiple-choice', 'checkboxes', 'dropdown'];

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: QUESTION_TYPES, required: true },
  text: { type: String, required: true, trim: true, maxlength: 500 },
  required: { type: Boolean, default: false },
  options: {
    type: [{ type: String, trim: true, maxlength: 200 }],
    default: [],
    validate: {
      validator(options) {
        if (!CHOICE_TYPES.includes(this.type)) {
          return options.length === 0;
        }

        return options.length >= 2 && options.every(Boolean);
      },
      message: 'Les questions à choix demandent au moins 2 options.',
    },
  },
});

const surveySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    category: { type: String, trim: true, maxlength: 80, default: 'Général' },
    expiresAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
    },
    shareId: {
      type: String,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Survey', surveySchema);
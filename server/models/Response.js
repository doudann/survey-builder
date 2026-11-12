const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Survey',
      required: true,
      index: true,
    },
    answers: { type: [answerSchema], default: [] },
    // Empreintes chiffrées : on ne stocke ni l'identifiant brut ni l'adresse IP
    respondentKey: { type: String, select: false },
    ipHash: { type: String, select: false },
  },
  { timestamps: true }
);

// Un même répondant ne peut répondre qu'une fois à un même sondage.
// Le filtre ignore les anciennes réponses qui n'ont pas de respondentKey.
responseSchema.index(
  { survey: 1, respondentKey: 1 },
  { unique: true, partialFilterExpression: { respondentKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Response', responseSchema);

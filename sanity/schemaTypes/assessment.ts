import {defineArrayMember, defineField, defineType} from 'sanity'

export const assessment = defineType({
  name: 'assessment',
  title: 'Assessment',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'instructions',
      title: 'Instructions',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'passingPercentage',
      title: 'Passing percentage',
      type: 'number',
      initialValue: 70,
      validation: (Rule) => Rule.required().integer().min(1).max(100),
    }),
    defineField({
      name: 'maxAttempts',
      title: 'Maximum attempts',
      type: 'number',
      description: 'Leave empty to allow unlimited attempts.',
      validation: (Rule) => Rule.integer().min(1),
    }),
    defineField({
      name: 'randomizeOptions',
      title: 'Randomize answer options',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'questions',
      title: 'Questions',
      type: 'array',
      of: [defineArrayMember({type: 'objectiveQuestion'})],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: {title: 'title', questions: 'questions'},
    prepare({title, questions}) {
      const count = Array.isArray(questions) ? questions.length : 0
      return {title, subtitle: `${count} ${count === 1 ? 'question' : 'questions'}`}
    },
  },
})
